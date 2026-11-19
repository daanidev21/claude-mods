// Mission panel: subagent tree and the files they touch.
import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { MissionFile, MissionNode } from '../types'

const PANE = 'mission-control'
const MAIN = 'main'
const NODE_LIMIT = 60
const FILE_LIMIT = 80

const nodes = atom(
  { plugin: 'mission-control', key: 'nodes' } as const,
  [] as MissionNode[],
  { shape: 'nodes-1' },
)
const files = atom(
  { plugin: 'mission-control', key: 'files' } as const,
  [] as MissionFile[],
  { shape: 'files-1' },
)
const view = atom(
  { plugin: 'mission-control', key: 'view' } as const,
  'agents' as 'agents' | 'files',
  { shape: 'view-1' },
)
const tick = atom({ plugin: 'mission-control', key: 'tick' } as const, 0, {
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

const elapsed = (n: Pick<MissionNode, 'startedAt' | 'endedAt'>, at: number) => {
  const s = Math.max(0, Math.round(((n.endedAt ?? at) - n.startedAt) / 1000))

  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

const icon = (n: MissionNode) =>
  n.status === 'running' ? '●' : n.status === 'done' ? '✓' : '✗'
const tone = (n: MissionNode) =>
  n.status === 'running' ? '#f59e0b' : n.status === 'done' ? '#22c55e' : '#ef4444'

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

const fileOf = (e: Record<string, unknown>) => {
  const tool = String(e.tool)
  const path = typeof e.file_path === 'string' ? e.file_path : ''
  if (!path) return null
  if (tool === 'Read') return { path, isEdit: false }
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') return { path, isEdit: true }

  return null
}

const MAIN_NODE = (): MissionNode => ({
  id: MAIN,
  parent: '',
  label: 'Sesión principal',
  status: 'running',
  startedAt: Date.now(),
  tools: 0,
  last: 'en espera',
})

const treeOf = (list: MissionNode[]) => {
  const byParent = new Map<string, MissionNode[]>()
  for (const n of list) {
    if (n.id === MAIN) continue
    const parent = list.some(p => p.id === n.parent) ? n.parent : MAIN
    byParent.set(parent, [...(byParent.get(parent) ?? []), n])
  }
  const out: { node: MissionNode; depth: number }[] = []
  const visit = (n: MissionNode, depth: number) => {
    out.push({ node: n, depth })
    for (const c of (byParent.get(n.id) ?? []).sort((a, b) => a.startedAt - b.startedAt)) {
      visit(c, depth + 1)
    }
  }
  const root = list.find(n => n.id === MAIN)
  if (root) visit(root, 0)

  return out
}

export const register: Register = on => {
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command
      .register({ name: 'mission', description: 'Panel de subagentes: quién hace qué y con qué archivos' })
      .catch(() => {})
    timer?.cancel()
    timer = $.clock.every(1000, () => {
      void (async () => {
        if ((await read($, nodes)).some(n => n.status === 'running' && n.id !== MAIN)) {
          await update($, tick, () => Date.now())
        }
      })().catch(() => {})
    })

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.agentId) {
      const id = result.agentId
      const one: MissionNode = {
        id,
        parent: e.parentAgentId ?? MAIN,
        label: clean(e.description || e.subagentType),
        model: result.model,
        status: 'running',
        startedAt: Date.now(),
        tools: 0,
        last: 'arrancando',
      }
      await update($, nodes, list => {
        const base = list.some(n => n.id === MAIN) ? list : [MAIN_NODE(), ...list]

        return [...base.filter(n => n.id !== id), one].slice(-NODE_LIMIT)
      })
    }

    return result
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? MAIN
    const raw = e as unknown as Record<string, unknown>
    const line = describe(raw)
    await update($, nodes, list => {
      const base = list.some(n => n.id === MAIN) ? list : [MAIN_NODE(), ...list]

      return base.map(n => (n.id === id ? { ...n, tools: n.tools + 1, last: line } : n))
    })
    const hit = fileOf(raw)
    if (hit) {
      await update($, files, list => {
        const old = list.find(f => f.path === hit.path)
        const one: MissionFile = {
          path: hit.path,
          by: old && old.by.includes(id) ? old.by : [...(old?.by ?? []), id],
          isRead: (old?.isRead ?? false) || !hit.isEdit,
          isEdited: (old?.isEdited ?? false) || hit.isEdit,
          at: Date.now(),
        }

        return [one, ...list.filter(f => f.path !== hit.path)].slice(0, FILE_LIMIT)
      })
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) {
      const id = e.agentId
      const failed = e.reason === 'error' || e.reason === 'aborted'
      await update($, nodes, all =>
        all.map(n =>
          n.id === id
            ? {
                ...n,
                status: failed ? ('failed' as const) : ('done' as const),
                endedAt: Date.now(),
                last: failed ? `parado: ${e.reason}` : 'terminado',
              }
            : n,
        ),
      )
    }

    return result
  })

  on('command.run', { command: 'mission' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '' && (await $.ui.panes()).some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })

      return { text: 'Panel de misión cerrado.' }
    }
    if (arg === 'archivos' || arg === 'files') await update($, view, () => 'files')
    else if (arg === 'agentes' || arg === 'who') await update($, view, () => 'agents')
    await $.ui.open({ id: PANE, title: 'Misión', focus: true })

    return { text: 'Panel de misión abierto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    await read($, tick)
    const at = Date.now()
    const list = await read($, nodes)
    const touched = await read($, files)
    const mode = await read($, view)
    const cwd = await $.session.cwd().catch(() => '')
    const names = new Map(list.map(n => [n.id, n.id === MAIN ? 'principal' : n.label]))
    const rel = (p: string) => (cwd && p.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p)
    const rows = Math.max(5, (e.viewport?.rows ?? 30) - 10)

    const tabs = (
      <Box flexDirection="row" gap={1}>
        <Button
          key="agents"
          label="Agentes"
          hotkey="a"
          variant={mode === 'agents' ? 'primary' : 'secondary'}
          onPress={() => update($, view, () => 'agents')}
        />
        <Button
          key="files"
          label={`Archivos (${touched.length})`}
          hotkey="f"
          variant={mode === 'files' ? 'primary' : 'secondary'}
          onPress={() => update($, view, () => 'files')}
        />
        <Button
          key="clear"
          label="Limpiar"
          hotkey="c"
          onPress={async () => {
            await update($, nodes, () => [])
            await update($, files, () => [])
          }}
        />
        <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
      </Box>
    )

    if (mode === 'files') {
      return (
        <Box flexDirection="column" gap={1}>
          {tabs}
          {touched.length === 0 && (
            <Text dimColor>Aún no se ha leído ni editado ningún archivo.</Text>
          )}
          {touched.slice(0, rows).map(f => (
            <Box key={f.path} flexDirection="column">
              <Text wrap="truncate">
                <Text color={f.isEdited ? '#f59e0b' : '#38bdf8'} bold>
                  {f.isEdited ? '✎' : '○'}{' '}
                </Text>
                {rel(f.path)}
              </Text>
              <Text dimColor wrap="truncate">
                {'   '}
                {f.isEdited && f.isRead ? 'leído y editado' : f.isEdited ? 'editado' : 'leído'} por{' '}
                {f.by.map(id => names.get(id) ?? 'agente').join(', ')}
              </Text>
            </Box>
          ))}
          {touched.length > rows && <Text dimColor>… {touched.length - rows} más</Text>}
        </Box>
      )
    }

    const tree = treeOf(list)
    const running = list.filter(n => n.status === 'running' && n.id !== MAIN).length

    return (
      <Box flexDirection="column" gap={1}>
        {tabs}
        <Text bold>
          {running} subagentes en marcha · {list.filter(n => n.id !== MAIN).length} en total
        </Text>
        {tree.length === 0 && (
          <Text dimColor>Aún no ha habido actividad en esta sesión.</Text>
        )}
        {tree.map(({ node, depth }) => (
          <Box key={node.id} flexDirection="column">
            <Text wrap="truncate">
              {'  '.repeat(depth)}
              {depth > 0 ? '└ ' : ''}
              <Text color={tone(node)} bold>
                {icon(node)} {node.label}
              </Text>
              <Text dimColor>
                {node.model ? `  ${modelName(node.model)}` : ''}
                {node.id === MAIN ? '' : `  ${elapsed(node, at)}`} · {node.tools} herramientas
              </Text>
            </Text>
            <Text dimColor wrap="truncate">
              {'  '.repeat(depth)}
              {depth > 0 ? '  ' : ''}
              {'   '}
              {node.last}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
