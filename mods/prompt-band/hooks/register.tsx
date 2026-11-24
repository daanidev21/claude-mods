// Row above the prompt: 5h and 7d limits, context and shortcuts to the other mods.
import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Limit, Limits } from '../types'

const LIMITS_MS = 60_000
const WARN_AT = 90
// the context auto-compacts well before 100%, so its warning comes earlier
const CTX_WARN_AT = 80
const CTX_AMBER_AT = 65
const warnAt = (kind: string) => (kind === 'context' ? CTX_WARN_AT : WARN_AT)
const BAR = '━'
// approximate pixels per cell on the desktop app
const PX_PER_CELL = 6.8
const NAMES: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7d',
  spend_limit: 'gasto',
  context: 'ctx',
}
const ORDER = ['five_hour', 'seven_day', 'spend_limit']

const limits = atom(
  { plugin: 'prompt-band', key: 'limits' } as const,
  null as Limits | null,
  { shape: 'limits-1' },
)
const warned = atom(
  { plugin: 'prompt-band', key: 'warned' } as const,
  {} as Record<string, number>,
  { shape: 'warned-1' },
)

const nameOf = (kind: string) => NAMES[kind] ?? kind.replace(/_/g, ' ')
const rank = (kind: string) => {
  const i = ORDER.indexOf(kind)
  return i < 0 ? ORDER.length : i
}
const resetAt = (l: Limit) => {
  const ms = l.resetsAt ? Date.parse(l.resetsAt) : NaN
  return Number.isFinite(ms) ? ms : 0
}

const tone = (pct: number, kind: string) =>
  pct >= warnAt(kind)
    ? '#ef4444'
    : pct >= (kind === 'context' ? CTX_AMBER_AT : 75)
      ? '#f59e0b'
      : '#22c55e'

// 105104 -> 105k, 1200000 -> 1.2M
const tokensLabel = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1000
      ? `${Math.round(n / 1000)}k`
      : String(n)

const countdown = (ms: number) => {
  const min = Math.max(0, Math.ceil(ms / 60_000))
  if (min < 1) return 'ya'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ${String(min % 60).padStart(2, '0')}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

type Row = {
  kind: string
  name: string
  pct: number
  left: number
  reset: string
  tokens?: number
  window?: number
  isMissing?: boolean
}

const rowsOf = (items: Limit[], now: number): Row[] =>
  items
    .filter(l => !(resetAt(l) > 0 && resetAt(l) <= now))
    .sort((a, b) => rank(a.kind) - rank(b.kind))
    .map(l => {
      const pct = Math.min(100, Math.max(0, l.percentUsed))
      return {
        kind: l.kind,
        name: nameOf(l.kind),
        pct,
        left: Math.round(100 - pct),
        reset: resetAt(l) > 0 ? countdown(resetAt(l) - now) : '',
        tokens: l.tokens,
        window: l.window,
      }
    })

// 5h and 7d stay on screen as empty cards between readings, but only on an
// account that has ever reported them: off a subscription (API key, Bedrock,
// Vertex, a gateway) there are none, and the cards would sit empty forever
const PLACEHOLDERS = ['five_hour', 'seven_day']

const withPlaceholders = (rows: Row[], hasWindows: boolean): Row[] => {
  if (!hasWindows) return rows
  const out = [...rows]
  for (const kind of PLACEHOLDERS) {
    if (!out.some(r => r.kind === kind)) {
      out.push({ kind, name: nameOf(kind), pct: 0, left: 100, reset: '', isMissing: true })
    }
  }

  return out.sort((a, b) => rank(a.kind) - rank(b.kind))
}

// 1: with countdown, 0: percentage only
const detailOf = (r: Row, detail: 0 | 1 | 2) => {
  const parts: string[] = []
  if (detail >= 1 && r.reset) parts.push(`↻ ${r.reset}`)
  if (detail >= 1 && r.kind === 'context' && r.tokens !== undefined && r.window) {
    parts.push(`${tokensLabel(r.tokens)}/${tokensLabel(r.window)}`)
  }
  return parts.join('  ·  ')
}

const pill = (pct: number, color: string, w: number) => {
  const h = 9
  const fill = pct <= 0 ? 0 : Math.min(w, Math.max(h, Math.round((w * pct) / 100)))
  const track = `<rect width="${w}" height="${h}" rx="${h / 2}" fill="rgba(128,128,128,0.28)"/>`
  const bar = fill > 0 ? `<rect width="${fill}" height="${h}" rx="${h / 2}" fill="${color}"/>` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${track}${bar}</svg>`
}

// below this the countdown goes, so the bar keeps room
const MIN_BAR = 10
// card text is smaller than a cell, so the fixed parts take less than counted
const SLACK = 4
const layout = (rows: Row[], cols: number) => {
  const GAP = 2
  const perCard = Math.floor((cols - GAP * (rows.length - 1)) / rows.length)
  const nameW = Math.max(2, ...rows.map(r => r.name.length))
  for (const detail of [1, 0] as const) {
    const textW = Math.max(...rows.map(r => detailOf(r, detail).length))
    // border and padding (4), name, percentage (4), text and gaps
    const barCells = perCard - 4 - nameW - 4 - textW - 3 * 2 + SLACK
    if (barCells >= MIN_BAR || detail === 0) {
      return { detail, nameW, barCells: Math.min(60, Math.max(4, barCells)) }
    }
  }

  return { detail: 0 as const, nameW, barCells: 4 }
}

const warn = async ($: any, items: Limit[]) => {
  const done = await read($, warned)
  const now = await $.clock.now()
  const fresh: Record<string, number> = {}
  const rearm: string[] = []
  for (const l of items) {
    const reset = resetAt(l)
    if (l.percentUsed < warnAt(l.kind)) {
      if (reset === 0 && done[l.kind] !== undefined) rearm.push(l.kind)
      continue
    }
    const last = done[l.kind]
    if (last !== undefined && reset <= last + 30 * 60_000) continue
    fresh[l.kind] = reset
    const when = reset > 0 ? `, reinicia en ${countdown(reset - now)}` : ''
    $.ui.toast(
      l.kind === 'context'
        ? `Contexto al ${Math.round(l.percentUsed)}%: conviene compactar con /compact o abrir otra sesión`
        : `Límite ${nameOf(l.kind)} al ${Math.round(l.percentUsed)}%${when}`,
    )
  }
  if (Object.keys(fresh).length > 0 || rearm.length > 0) {
    await update($, warned, old => {
      const merged = { ...old, ...fresh }
      return Object.fromEntries(
        Object.entries(merged).filter(([k]) => !rearm.includes(k)),
      )
    })
  }
}

type Ctx = { percent?: number; tokens?: number; window?: number }

const take = async ($: any, rateLimits: readonly Limit[], ctx?: Ctx) => {
  const items = rateLimits
    .filter(l => Number.isFinite(l.percentUsed))
    .map(l => ({
      kind: l.kind,
      percentUsed: l.percentUsed,
      resetsAt: l.resetsAt,
    }))
  // after a reload the session reports none until the next reply: keep the last known
  const before = (await read($, limits))?.items ?? []
  for (const old of before) {
    if (old.kind !== 'context' && !items.some(l => l.kind === old.kind)) {
      items.push({ kind: old.kind, percentUsed: old.percentUsed, resetsAt: old.resetsAt })
    }
  }
  // context is treated as one more window
  if (ctx?.percent !== undefined && Number.isFinite(ctx.percent)) {
    items.push({
      kind: 'context',
      percentUsed: ctx.percent,
      resetsAt: undefined,
      tokens: ctx.tokens,
      window: ctx.window,
    })
  }
  // `at` changes on every reading and forces a redraw
  await update($, limits, () => ({ at: Date.now(), items }))
  await warn($, items)
}

const readLimits = async ($: any) => {
  try {
    const u = await $.session.usage()
    await take($, u.rateLimits, u.context)
  } catch {
    // no reading yet
  }
}

// hair spaces even out the glyph widths, measured on the desktop app
const H = '\u200a'
const SHORTCUTS = [
  { command: 'heatmap', icon: '▦', label: 'Actividad', pad: [H, H] },
  { command: 'radar', icon: '◎', label: 'Radar', pad: ['', ''] },
  { command: 'mission', icon: '✦', label: 'Misión', pad: [H, H + H] },
  { command: 'modelo-justo', icon: '⚖', label: 'Modelo', pad: [H + H, H + H + H] },
  { command: 'comandos', icon: '❯', label: 'Comandos', pad: [H + H + H, H + H + H + H] },
  { command: 'ramas', icon: '⎇', label: 'Ramas', pad: ['', ''] },
]

const openMod = async ($: any, command: string) => {
  try {
    await $.command.run({ command })
  } catch {
    $.ui.toast(`/${command} no está disponible`)
  }
}

export const register: Register = on => {
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    timer?.cancel()
    timer = $.clock.every(LIMITS_MS, () => void readLimits($))
    await readLimits($)

    return result
  })

  on('session.measure', async ($, e, next) => {
    await take($, e.rateLimits as Limit[], e.context).catch(() => {})

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const held = await read($, limits)
    const now = await $.clock.now()
    const live = held ? rowsOf(held.items, now) : []
    const hasWindows = held?.items.some(l => l.kind !== 'context') ?? false
    const rows = withPlaceholders(live, hasWindows)

    const known = new Set(
      (await $.command.list()).map((c: { name: string }) => c.name),
    )
    const tools = SHORTCUTS.filter(t => known.has(t.command))
    if (rows.length === 0 && tools.length === 0) return next(e)

    const toolsW = tools.length
      ? tools.length * 4 + 1
      : 0
    const cols = (e.props.bodyColumns ?? 80) - 2 - toolsW - (tools.length && rows.length ? 2 : 0)
    const { detail, nameW, barCells } = rows.length
      ? layout(rows, cols)
      : { detail: 0 as const, nameW: 2, barCells: 4 }
    const { Box, Text, Svg, Button } = $.ui.resolve(e) as any
    const hasSvg = e.surface === 'desktop' && Svg !== undefined

    return (
      <Box flexDirection="row" gap={2} paddingX={1}>
        {rows.map(r => {
          const color = r.isMissing ? '#9ca3af' : tone(r.pct, r.kind)
          const text = detailOf(r, detail)
          const filled = Math.round((r.pct / 100) * barCells)
          const bar = hasSvg ? (
            <Svg
              source={pill(r.pct, color, Math.round(barCells * PX_PER_CELL))}
              alt={r.isMissing ? `${r.name} sin datos` : `${r.name} ${Math.round(r.pct)}% usado`}
            />
          ) : (
            <Text>
              <Text color={color}>{BAR.repeat(filled)}</Text>
              <Text dimColor>{BAR.repeat(barCells - filled)}</Text>
            </Text>
          )

          return (
            <Box
              key={r.name}
              flexGrow={1}
              flexDirection="row"
              alignItems="center"
              gap={2}
              borderStyle="round"
              borderDimColor
              paddingX={1}
            >
              <Box width={nameW}>
                <Text dimColor size="caption">
                  {r.name}
                </Text>
              </Box>
              {bar}
              <Box width={4} justifyContent="flex-end">
                <Text color={color} bold={!r.isMissing} dimColor={r.isMissing} size="caption">
                  {r.isMissing ? '-' : `${Math.round(r.pct)}%`}
                </Text>
              </Box>
              {text !== '' && (
                <Text dimColor size="caption" wrap="truncate">
                  {text}
                </Text>
              )}
            </Box>
          )
        })}
        {tools.length > 0 && (
          <Box flexDirection="row" gap={1} alignItems="center">
            {tools.map(t => (
              <Button
                key={t.command}
                label={`${t.pad[0]}${t.icon}${t.pad[1]}`}
                onPress={() => openMod($, t.command)}
              />
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
