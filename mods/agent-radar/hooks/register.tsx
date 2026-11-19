// Agent radar: one line per running subagent, plus a pane with the detail.
import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { RadarAgent } from '../types'

const PANE = 'agent-radar'
const SHOW_DONE_MS = 30_000
const BAND_ROWS = 4
const LIMIT = 30

const agents = atom(
  { plugin: 'agent-radar', key: 'agents' } as const,
  [] as RadarAgent[],
  { shape: 'agents-1' },
)
const selected = atom(
  { plugin: 'agent-radar', key: 'selected' } as const,
  null as string | null,
  { shape: 'selected-1' },
)
const tick = atom({ plugin: 'agent-radar', key: 'tick' } as const, 0, {
  shape: 'tick-1',
})

const clean = (text: string) =>
  [...text].filter(c => c >= ' ' && c !== '\u007f').join('').trim()

const modelName = (id: string): string => {
  const parts = id.toLowerCase().split(/[-.:@_/]/)
  const family = parts.find(p => ['fable', 'opus', 'sonnet', 'haiku'].includes(p))
  if (!family) return id.length > 24 ? `${id.slice(0, 23)}…` : id
  const version = parts.filter(p => /^\d{1,2}$/.test(p)).slice(0, 2)
  const name = family[0]!.toUpperCase() + family.slice(1)

  return version.length ? `${name} ${version.join('.')}` : name
}

const elapsed = (a: Pick<RadarAgent, 'startedAt' | 'endedAt'>, at: number) => {
  const s = Math.max(0, Math.round(((a.endedAt ?? at) - a.startedAt) / 1000))

  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

const isShown = (a: RadarAgent, at: number) =>
  a.status === 'running' || (a.endedAt !== undefined && at - a.endedAt < SHOW_DONE_MS)

const icon = (a: RadarAgent) =>
  a.status === 'running' ? '●' : a.status === 'done' ? '✓' : '✗'
const tone = (a: RadarAgent) =>
  a.status === 'running' ? '#f59e0b' : a.status === 'done' ? '#22c55e' : '#ef4444'

// short label for a tool call; for Bash only the program is kept, not the command line
const describe = (e: Record<string, unknown>): string => {
  const tool = String(e.tool)
  const text = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : '')
  const file = (p: string) => p.split('/').slice(-2).join('/')
  if (tool === 'Bash') return `ejecutando ${clean(text('description')) || text('command').trim().split(/\s+/)[0] || 'un comando'}`
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') return `editando ${file(text('file_path'))}`
  if (tool === 'Read') return `leyendo ${file(text('file_path'))}`
  if (tool === 'Grep' || tool === 'Glob') return `buscando ${clean(text('pattern')).slice(0, 30)}`
  if (tool.startsWith('mcp__')) return `usando ${tool.split('__').slice(1).join(' ')}`

  return `usando ${tool}`
}

export const register: Register = on => {
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command
      .register({ name: 'radar', description: 'Qué hace cada subagente' })
      .catch(() => {})
    timer?.cancel()
    timer = $.clock.every(1000, () => {
      void (async () => {
        const at = Date.now() - 3_000
        if ((await read($, agents)).some(a => isShown(a, at))) {
          await update($, tick, () => Date.now())
        }
      })().catch(() => {})
    })

    return result
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.agentId) {
      const id = result.agentId
      const one: RadarAgent = {
        id,
        description: clean(e.description || e.subagentType),
        type: e.subagentType,
        model: result.model,
        status: 'running',
        startedAt: Date.now(),
        tools: 0,
        last: 'arrancando',
      }
      await update($, agents, list =>
        [one, ...list.filter(a => a.id !== id)].slice(0, LIMIT),
      )
    }

    return result
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) {
      const id = e.agentId
      const line = describe(e as unknown as Record<string, unknown>)
      await update($, agents, list =>
        list.map(a => (a.id === id ? { ...a, tools: a.tools + 1, last: line } : a)),
      )
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) {
      const id = e.agentId
      const failed = e.reason === 'error' || e.reason === 'aborted'
      const list = await update($, agents, all =>
        all.map(a =>
          a.id === id
            ? {
                ...a,
                status: failed ? ('failed' as const) : ('done' as const),
                endedAt: Date.now(),
                last: failed ? `parado: ${e.reason}` : 'terminado',
              }
            : a,
        ),
      )
      const one = list.find(a => a.id === id)
      if (one) {
        $.ui.toast(
          `${failed ? '✗' : '✓'} ${one.description} ${failed ? 'ha fallado' : 'terminado'} (${elapsed(one, Date.now())} · ${one.tools} herramientas)`,
        )
      }
    }

    return result
  })

  on('command.run', { command: 'radar' }, async $ => {
    if ((await $.ui.panes()).some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })

      return { text: 'Radar cerrado.' }
    }
    await update($, selected, () => null)
    await $.ui.open({ id: PANE, title: 'Radar de agentes', focus: true })
    const list = await read($, agents)
    const running = list.filter(a => a.status === 'running').length

    return { text: `${running} en marcha, ${list.length - running} terminados` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await read($, tick)
    const at = Date.now()
    const shown = (await read($, agents)).filter(a => isShown(a, at))
    if (e.props.hasSurvey || shown.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" paddingX={1} gap={0}>
        {shown.slice(0, BAND_ROWS).map(a => (
          <Box
            key={a.id}
            flexDirection="row"
            gap={2}
            paddingX={1}
            backgroundColor="rgba(128,128,128,0.16)"
          >
            <Text color={tone(a)} bold size="caption">
              {icon(a)} {a.description}
            </Text>
            {a.model && (
              <Text dimColor size="caption">
                {modelName(a.model)}
              </Text>
            )}
            <Text dimColor size="caption">
              {elapsed(a, at)} · {a.tools} herramientas
            </Text>
            <Text size="caption" wrap="truncate">
              {a.last}
            </Text>
          </Box>
        ))}
        {shown.length > BAND_ROWS && (
          <Text dimColor size="caption">
            +{shown.length - BAND_ROWS} más · /radar
          </Text>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    await read($, tick)
    const at = Date.now()
    const list = await read($, agents)
    const pick = await read($, selected)
    const one = list.find(a => a.id === pick)
    const width = Math.max(10, (e.props.bodyColumns ?? 60) - 2)

    if (one) {
      const found = await $.session.messages({ agentId: one.id })
      const messages = 'deny' in found ? [] : found.slice(-6)

      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text>
              <Text color={tone(one)} bold>
                {icon(one)} {one.description}
              </Text>
              <Text dimColor>
                {'  '}
                {one.model ? `${modelName(one.model)} · ` : ''}
                {one.type} · {elapsed(one, at)} · {one.tools} herramientas
              </Text>
            </Text>
            <Text dimColor wrap="truncate">
              ahora: {one.last}
            </Text>
            <Text dimColor>{'─'.repeat(width)}</Text>
          </Box>
          {messages.length === 0 && <Text dimColor>Aún sin mensajes.</Text>}
          {messages.map(m => (
            <Text wrap="truncate">
              <Text bold color={m.role === 'assistant' ? '#38bdf8' : undefined}>
                {m.role === 'assistant' ? 'agente: ' : 'tarea:  '}
              </Text>
              {clean(m.text).replace(/\s+/g, ' ').slice(0, 400) || '(llamadas a herramientas)'}
            </Text>
          ))}
          <Box flexDirection="row" gap={1}>
            <Button key="back" label="Volver" hotkey="b" variant="primary" onPress={() => update($, selected, () => null)} />
            <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
          </Box>
        </Box>
      )
    }

    const running = list.filter(a => a.status === 'running').length

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>
          {running} en marcha · {list.length - running} terminados
        </Text>
        {list.length === 0 && <Text dimColor>Aún no ha habido subagentes en esta sesión.</Text>}
        {list.slice(0, 9).map((a, i) => (
          <Button
            key={`agent-${a.id}`}
            plain
            hotkey={String(i + 1)}
            dimColor={a.status !== 'running'}
            label={`${icon(a)} ${a.description}${a.model ? ` (${modelName(a.model)})` : ''} · ${elapsed(a, at)} · ${a.tools} herramientas`}
            onPress={() => update($, selected, () => a.id)}
          />
        ))}
        {list.length > 9 && <Text dimColor>… {list.length - 9} anteriores</Text>}
        <Box flexDirection="row" gap={1}>
          <Button key="clear" label="Limpiar terminados" hotkey="c" onPress={() => update($, agents, all => all.filter(x => x.status === 'running'))} />
          <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
