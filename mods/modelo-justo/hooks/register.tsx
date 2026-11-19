// Modelo justo: picks Haiku, Sonnet or Opus for subagents that name no model,
// from their short description. `/modelo-justo` opens the panel.
import type { Register } from 'claude-code'

const PANE = 'modelo-justo'
const TIERS = {
  simple: { alias: 'haiku', name: 'Haiku' },
  normal: { alias: 'sonnet', name: 'Sonnet' },
  compleja: { alias: 'opus', name: 'Opus' },
} as const
type Tier = keyof typeof TIERS

const LABELS = ['simple', 'normal', 'compleja'] as const
const ENABLED = 'enabled'
const MODE = 'mode'
const OPUS = 'opus'
const PICKS = 'picks'
const MAX_PICKS = 40
const TONE: Record<Tier, string> = {
  simple: '#22c55e',
  normal: '#38bdf8',
  compleja: '#f59e0b',
}
const ACCENT = '#38bdf8'
const CARD = {
  backgroundColor: 'rgba(128,128,128,0.16)',
  borderStyle: 'round',
  borderDimColor: true,
  paddingX: 1,
} as const

type OpusPolicy = 'permitir' | 'avisar' | 'preguntar' | 'limitar'
const POLICIES: { id: OpusPolicy; label: string; key: string; help: string }[] = [
  { id: 'permitir', label: 'Permitir', key: 'p', help: 'Opus se asigna sin más.' },
  { id: 'avisar', label: 'Avisar', key: 'v', help: 'Opus se asigna y sale un aviso.' },
  { id: 'preguntar', label: 'Preguntar', key: 'r', help: 'Antes de usar Opus te pregunta, y el subagente espera tu respuesta.' },
  { id: 'limitar', label: 'Limitar', key: 'l', help: 'Nunca se usa Opus en subagentes: el máximo es Sonnet.' },
]

type Pick = {
  at: number
  label: string
  tier: Tier
  applied: boolean
  note: string
}

const isTier = (label: string | undefined): label is Tier =>
  label !== undefined && label in TIERS

async function isOn($: any): Promise<boolean> {
  return (await $.store.get(ENABLED)) !== false
}

// auto applies the pick; sugerir only records it
async function modeOf($: any): Promise<'auto' | 'sugerir'> {
  return (await $.store.get(MODE)) === 'sugerir' ? 'sugerir' : 'auto'
}

async function opusOf($: any): Promise<OpusPolicy> {
  const stored = await $.store.get(OPUS)

  return POLICIES.some(p => p.id === stored) ? (stored as OpusPolicy) : 'avisar'
}

async function picksOf($: any): Promise<Pick[]> {
  const stored = await $.store.get(PICKS)

  return Array.isArray(stored) ? (stored as Pick[]) : []
}

async function remember($: any, pick: Pick): Promise<void> {
  const list = await picksOf($)
  await $.store.set(PICKS, [pick, ...list].slice(0, MAX_PICKS))
  $.ui.invalidate('ui.render')
}

// tier from the short description only; the task text is never sent
async function pickForAgent($: any, description: string): Promise<Tier> {
  const label = description.trim().slice(0, 200)
  if (!label) return 'normal'
  try {
    const answer = await $.model.classify(label, LABELS)
    if (isTier(answer)) return answer
  } catch {
  }

  return 'normal'
}

async function setEnabled($: any, value: boolean): Promise<void> {
  await $.store.set(ENABLED, value)
  $.ui.status(value ? '⚖ modelo justo: activo' : undefined)
  $.ui.invalidate('ui.render')
}

async function setMode($: any, mode: 'auto' | 'sugerir'): Promise<void> {
  await $.store.set(MODE, mode)
  $.ui.invalidate('ui.render')
}

async function setOpus($: any, policy: OpusPolicy): Promise<void> {
  await $.store.set(OPUS, policy)
  $.ui.invalidate('ui.render')
}

async function clearPicks($: any): Promise<void> {
  await $.store.set(PICKS, [])
  $.ui.invalidate('ui.render')
}

async function decideOpus(
  $: any,
  policy: OpusPolicy,
  label: string,
): Promise<{ tier: Tier; note: string }> {
  if (policy === 'permitir') return { tier: 'compleja', note: '' }
  if (policy === 'limitar') return { tier: 'normal', note: 'Opus limitado' }
  if (policy === 'avisar') {
    $.ui.toast(`El subagente «${label}» usará Opus`)

    return { tier: 'compleja', note: 'avisado' }
  }
  try {
    const answer = await $.ui.ask(`El subagente «${label.slice(0, 80)}» quiere usar Opus. ¿Qué modelo uso?`, [
      'Permitir Opus',
      'Usar Sonnet',
      'Usar Haiku',
    ])
    if (answer === 'Permitir Opus') return { tier: 'compleja', note: 'preguntado' }
    if (answer === 'Usar Haiku') return { tier: 'simple', note: 'preguntado' }
  } catch {
  }

  return { tier: 'normal', note: 'Opus no permitido' }
}

const hour = (ms: number) => new Date(ms).toTimeString().slice(0, 5)

const HELP =
  'Uso: /modelo-justo (panel) · on|off · auto|sugerir · opus permitir|avisar|preguntar|limitar · lista'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command
      .register({
        name: 'modelo-justo',
        description: 'Panel de Modelo justo: modelo de los subagentes',
        argumentHint: 'on|off|auto|sugerir|opus <política>|lista',
      })
      .catch(() => {})
    if (await isOn($)) $.ui.status('⚖ modelo justo: activo')

    return next(e)
  })

  on('command.run', { command: 'modelo-justo' }, async ($, e) => {
    const [arg = '', value = ''] = e.args.trim().toLowerCase().split(/\s+/)

    if (arg === '') {
      if ((await $.ui.panes()).some(p => p.id === PANE)) {
        await $.ui.close({ id: PANE })

        return { text: 'Panel de Modelo justo cerrado.' }
      }
      await $.ui.open({ id: PANE, title: 'Modelo justo' })

      return { text: 'Panel de Modelo justo abierto.' }
    }
    if (arg === 'on' || arg === 'off') {
      await setEnabled($, arg === 'on')

      return { text: arg === 'on' ? 'Modelo justo activado.' : 'Modelo justo apagado.' }
    }
    if (arg === 'auto' || arg === 'sugerir') {
      await setMode($, arg)

      return {
        text:
          arg === 'auto'
            ? 'Modo automático: los subagentes que no nombren modelo recibirán el elegido.'
            : 'Modo sugerir: la elección solo se anota, no se aplica.',
      }
    }
    if (arg === 'opus') {
      const policy = POLICIES.find(p => p.id === value)
      if (!policy) return { text: 'Uso: /modelo-justo opus permitir|avisar|preguntar|limitar' }
      await setOpus($, policy.id)

      return { text: `Opus en subagentes: ${policy.label.toLowerCase()}. ${policy.help}` }
    }
    if (arg === 'lista') {
      const picks = await picksOf($)
      if (picks.length === 0) return { text: 'Aún no hay elecciones de subagentes.' }
      const lines = picks.slice(0, 15).map(p => {
        return `${hour(p.at)}  ${p.label.slice(0, 50)} → ${TIERS[p.tier].name}${p.note ? ` (${p.note})` : ''}`
      })

      return { text: `Últimos subagentes:\n${lines.join('\n')}` }
    }

    return { text: HELP }
  })

  on('agent.spawn', async ($, e, next) => {
    if (e.subagentType === 'fork' || !(await isOn($))) return next(e)
    const label = e.description || e.subagentType

    if (e.model && e.model !== 'inherit') {
      await remember($, { at: Date.now(), label, tier: 'normal', applied: false, note: `nombrado: ${e.model}` })

      return next(e)
    }

    let tier = await pickForAgent($, e.description || '')
    if ((await modeOf($)) === 'sugerir') {
      await remember($, { at: Date.now(), label, tier, applied: false, note: 'solo sugerido' })
      $.ui.status(`⚖ subagente ${label}: sugerido ${TIERS[tier].name} (no aplicado)`)

      return next(e)
    }

    let note = ''
    if (tier === 'compleja') {
      const decision = await decideOpus($, await opusOf($), label)
      tier = decision.tier
      note = decision.note
    }

    await remember($, { at: Date.now(), label, tier, applied: true, note })
    $.ui.status(`⚖ subagente ${label} → ${TIERS[tier].name}`)

    return next({ ...e, model: TIERS[tier].alias })
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const enabled = await isOn($)
    const mode = await modeOf($)
    const policy = await opusOf($)
    const picks = await picksOf($)
    const rows = Math.max(3, Math.floor(((e.viewport?.rows ?? 30) - 26) / 2))

    const choice = (
      id: string,
      label: string,
      help: string,
      hotkey: string,
      selected: boolean,
      onPress: () => void,
    ) => (
      <Box key={id} flexDirection="column">
        <Button key={`${id}-b`} plain hotkey={hotkey} onPress={onPress}>
          <Text bold={selected} color={selected ? ACCENT : undefined}>
            {selected ? '◉' : '○'} {label}
          </Text>
        </Button>
        <Box paddingLeft={3}>
          <Text dimColor size="caption">
            {help}
          </Text>
        </Box>
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        <Box {...CARD} flexDirection="row" justifyContent="space-between" alignItems="center" paddingY={1}>
          <Box flexDirection="column">
            <Text bold color={enabled ? '#22c55e' : undefined} dimColor={!enabled}>
              {enabled ? '● Activo' : '○ Apagado'}
            </Text>
            <Text dimColor size="caption">
              Elige el modelo de los subagentes
            </Text>
          </Box>
          <Button
            key="toggle"
            label={enabled ? 'Apagar' : 'Activar'}
            hotkey="o"
            variant={enabled ? 'secondary' : 'primary'}
            onPress={() => setEnabled($, !enabled)}
          />
        </Box>

        <Box {...CARD} flexDirection="column" gap={1} paddingY={1}>
          <Text dimColor size="caption">
            SUBAGENTES SIN MODELO NOMBRADO
          </Text>
          {choice('auto', 'Automático', 'Se les pone Haiku, Sonnet u Opus según su descripción.', 'a', mode === 'auto', () => setMode($, 'auto'))}
          {choice('sugerir', 'Solo sugerir', 'La elección se anota abajo, pero no se aplica.', 's', mode === 'sugerir', () => setMode($, 'sugerir'))}
        </Box>

        <Box {...CARD} flexDirection="column" gap={1} paddingY={1}>
          <Text dimColor size="caption">
            OPUS EN SUBAGENTES
          </Text>
          {POLICIES.map(p => choice(p.id, p.label, p.help, p.key, policy === p.id, () => setOpus($, p.id)))}
        </Box>

        <Box {...CARD} flexDirection="column" gap={1} paddingY={1}>
          <Text dimColor size="caption">
            ÚLTIMOS SUBAGENTES
          </Text>
          {picks.length === 0 && <Text dimColor>Aún no ha habido subagentes.</Text>}
          {picks.slice(0, rows).map((p, i) => (
            <Box key={String(i)} flexDirection="column">
              <Box flexDirection="row" gap={2}>
                <Box width={5}>
                  <Text dimColor>{hour(p.at)}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text wrap="truncate">{p.label}</Text>
                </Box>
              </Box>
              <Box flexDirection="row" gap={1} paddingLeft={7}>
                <Text color={TONE[p.tier]} bold>
                  ● {TIERS[p.tier].name}
                </Text>
                {p.note !== '' && (
                  <Text dimColor size="caption">
                    {p.note}
                  </Text>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        <Box flexDirection="row" gap={1}>
          <Button key="clear" label="Limpiar lista" hotkey="c" onPress={() => clearPicks($)} />
          <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
