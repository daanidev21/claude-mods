// Activity map: one square per day, computed locally from the session logs.
import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Row } from '../types'

const PANE = 'heatmap'
const REFRESH_MS = 10 * 60_000
const MAX_WEEKS = 52
const LABEL_COLS = 4
const DAY_MS = 86_400_000
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// none plus four levels: <15 min, <1 h, <3 h, more
const RAMP = ['#9ca3af', '#fcd5c0', '#f4a582', '#e06c3c', '#b3380e']
const CELL = '■'

const rows = atom(
  { plugin: 'heatmap', key: 'rows' } as const,
  null as Row[] | null,
  { shape: 'rows-1' },
)
const scope = atom(
  { plugin: 'heatmap', key: 'scope' } as const,
  'all' as 'all' | 'repo',
  { shape: 'scope-1' },
)
const error = atom({ plugin: 'heatmap', key: 'error' } as const, '', {
  shape: 'error-1',
})

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dateOf = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y as number, (m as number) - 1, d as number)
}
const addDays = (day: string, n: number) => {
  const d = dateOf(day)
  d.setDate(d.getDate() + n)
  return ymd(d)
}
// Monday is 0, Sunday is 6
const weekday = (day: string) => (dateOf(day).getDay() + 6) % 7

const level = (min: number, sessions: number) => {
  if (min <= 0 && sessions <= 0) return 0
  return min < 15 ? 1 : min < 60 ? 2 : min < 180 ? 3 : 4
}

const duration = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h} h ${pad(m)} min` : `${m} min`
}

// 395202 -> 395k, 4831417 -> 4.8M
const tokens = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1000
      ? `${Math.round(n / 1000)}k`
      : String(n)

const PX_PER_CELL = 6.8
const CARD = {
  backgroundColor: 'rgba(128,128,128,0.16)',
  borderStyle: 'round',
  borderDimColor: true,
  paddingX: 1,
} as const

const pill = (ratio: number, width: number, color: string) => {
  const h = 8
  const fill = ratio <= 0 ? 0 : Math.min(width, Math.max(h, Math.round(width * ratio)))
  const track = `<rect width="${width}" height="${h}" rx="${h / 2}" fill="rgba(128,128,128,0.28)"/>`
  const bar = fill > 0 ? `<rect width="${fill}" height="${h}" rx="${h / 2}" fill="${color}"/>` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">${track}${bar}</svg>`
}

// work = new input + output; cached = cache reads, which repeat on every turn
type Day = { min: number; sessions: number; work: number; cached: number }

const streaks = (days: Map<string, Day>, today: string) => {
  const active = (d: string) => {
    const x = days.get(d)
    return !!x && (x.min > 0 || x.sessions > 0)
  }
  let current = 0
  let cursor = active(today) ? today : addDays(today, -1)
  while (active(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  const keys = [...days.keys()].filter(active).sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }

  return { current, best }
}

// project folder name, as Claude Code spells it
const repoKey = (cwd: string) => cwd.replace(/[^A-Za-z0-9]/g, '-')

const refresh = async ($: any) => {
  try {
    // Windows ships `python`/`py`, not `python3` (that name is a Store stub there)
    const script = `${$.plugin.root}/scripts/heat.py`
    const candidates = [['python'], ['py', '-3'], ['python3']]
    let run: any
    let last = ''
    for (const cmd of candidates) {
      try {
        const r = await $.process.run([...cmd, '-I', script], { timeoutMs: 60_000 })
        if (r.exitCode === 0) {
          run = r
          break
        }
        last = (r.stderr || r.stdout || '').trim().slice(-200)
      } catch (err) {
        last = err instanceof Error ? err.message : String(err)
      }
    }
    if (!run) throw new Error(last || 'No se encontró Python (python, py ni python3)')
    await update($, rows, () => JSON.parse(run.stdout) as Row[])
    await update($, error, () => '')
  } catch (err) {
    await update($, error, () => (err instanceof Error ? err.message : String(err)))
  }
}

export const register: Register = on => {
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command
      .register({ name: 'heatmap', description: 'Mapa de actividad de tu tiempo en Claude Code' })
      .catch(() => {})
    timer?.cancel()
    timer = $.clock.every(REFRESH_MS, () => void refresh($))
    void refresh($)

    return next(e)
  })

  on('command.run', { command: 'heatmap' }, async $ => {
    if ((await $.ui.panes()).some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })

      return { text: 'Mapa de actividad cerrado.' }
    }
    await $.ui.open({ id: PANE, title: 'Actividad' })
    void refresh($)

    return { text: 'Mapa de actividad abierto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Svg } = $.ui.resolve(e) as any
    const hasSvg = e.surface === 'desktop' && Svg !== undefined
    const all = await read($, rows)
    const mode = await read($, scope)
    const failure = await read($, error)

    if (!all) {
      return <Text dimColor>{failure ? `Error: ${failure}` : 'Calculando…'}</Text>
    }

    const cwd = await $.session.cwd().catch(() => '')
    const here = repoKey(cwd)
    const list = mode === 'repo' ? all.filter(r => r.p === here) : all

    const today = ymd(new Date(await $.clock.now()))
    const columns = e.props.bodyColumns ?? 60
    const weeks = Math.max(1, Math.min(MAX_WEEKS, Math.floor((columns - LABEL_COLS) / 2)))
    const start = addDays(today, -weekday(today) - (weeks - 1) * 7)

    const days = new Map<string, Day>()
    const byProject = new Map<string, number>()
    const byWeekday = new Array<number>(7).fill(0)
    for (const r of list) {
      const d = days.get(r.d) ?? { min: 0, sessions: 0, work: 0, cached: 0 }
      d.min += r.min
      d.sessions += r.s
      d.work += (r.ti ?? 0) + (r.to ?? 0)
      d.cached += r.tc ?? 0
      days.set(r.d, d)
      if (r.d >= start) {
        byProject.set(r.n, (byProject.get(r.n) ?? 0) + r.min)
        byWeekday[weekday(r.d)]! += r.min
      }
    }

    const months: { name: string; count: number }[] = []
    for (let w = 0; w < weeks; w++) {
      const name = MONTHS[dateOf(addDays(start, w * 7)).getMonth()]!
      const last = months[months.length - 1]
      if (last && last.name === name) last.count++
      else months.push({ name, count: 1 })
    }

    // fixed-width boxes keep the columns aligned
    const grid = WEEKDAYS.map((name, wd) => (
      <Box key={name} flexDirection="row">
        <Box width={LABEL_COLS}>
          <Text dimColor>{name}</Text>
        </Box>
        {Array.from({ length: weeks }, (_, w) => {
          const day = addDays(start, w * 7 + wd)
          if (day > today) return <Box key={String(w)} width={2} />
          const d = days.get(day)
          const lv = d ? level(d.min, d.sessions) : 0
          return (
            <Box key={String(w)} width={2}>
              <Text color={RAMP[lv]} dimColor={lv === 0} bold={day === today}>
                {CELL}
              </Text>
            </Box>
          )
        })}
      </Box>
    ))

    const inRange = [...days.entries()].filter(([d]) => d >= start && d <= today)
    const total = inRange.reduce((s, [, d]) => s + d.min, 0)
    const activeDays = inRange.filter(([, d]) => d.min > 0 || d.sessions > 0).length
    const work = inRange.reduce((s, [, d]) => s + d.work, 0)
    const cached = inRange.reduce((s, [, d]) => s + d.cached, 0)
    const todayWork = days.get(today)?.work ?? 0
    const todayCached = days.get(today)?.cached ?? 0
    const { current, best } = streaks(days, today)
    const busiest = byWeekday.indexOf(Math.max(...byWeekday))
    const top = [...byProject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    const wide = columns >= 56
    const barCells = Math.max(10, columns - 6)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Box width={LABEL_COLS} />
            {months.map((m, i) => (
              <Box key={String(i)} width={m.count * 2}>
                <Text dimColor wrap="truncate">
                  {m.count >= 2 ? m.name : ''}
                </Text>
              </Box>
            ))}
          </Box>
          {grid}
          <Box flexDirection="row" alignItems="center">
            <Box width={LABEL_COLS} />
            <Text dimColor>menos </Text>
            {RAMP.map((c, i) => (
              <Box key={String(i)} width={2}>
                <Text color={c} dimColor={i === 0}>
                  {CELL}
                </Text>
              </Box>
            ))}
            <Text dimColor> más</Text>
          </Box>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Box {...CARD} flexGrow={1} flexDirection="column">
            <Text dimColor size="caption">
              Tiempo activo
            </Text>
            <Text bold size={wide ? 'heading' : 'body'} wrap="truncate">
              {duration(total)}
            </Text>
            <Text dimColor size="caption" wrap="truncate">
              {activeDays} días · {weeks} sem.
            </Text>
          </Box>
          <Box {...CARD} flexGrow={1} flexDirection="column">
            <Text dimColor size="caption">
              Racha
            </Text>
            <Text bold size={wide ? 'heading' : 'body'} color={current > 0 ? '#e06c3c' : undefined}>
              {current} {current === 1 ? 'día' : 'días'}
            </Text>
            <Text dimColor size="caption">
              mejor: {best}
            </Text>
          </Box>
          <Box {...CARD} flexGrow={1} flexDirection="column">
            <Text dimColor size="caption">
              Día más activo
            </Text>
            <Text bold size={wide ? 'heading' : 'body'} wrap="truncate">
              {total > 0 ? WEEKDAY_NAMES[busiest] : '-'}
            </Text>
            <Text dimColor size="caption">
              {total > 0 ? duration(byWeekday[busiest]!) : ''}
            </Text>
          </Box>
        </Box>

        {work + cached > 0 && (
          <Box flexDirection="row" gap={1}>
            <Box {...CARD} flexGrow={1} flexDirection="column">
              <Text dimColor size="caption">
                Consumo hoy
              </Text>
              <Text bold size={wide ? 'heading' : 'body'} wrap="truncate">
                {tokens(todayWork)}
              </Text>
              <Text dimColor size="caption" wrap="truncate">
                +{tokens(todayCached)} en caché
              </Text>
            </Box>
            <Box {...CARD} flexGrow={1} flexDirection="column">
              <Text dimColor size="caption">
                Consumo · {weeks} sem.
              </Text>
              <Text bold size={wide ? 'heading' : 'body'} wrap="truncate">
                {tokens(work)}
              </Text>
              <Text dimColor size="caption" wrap="truncate">
                +{tokens(cached)} en caché
              </Text>
            </Box>
          </Box>
        )}

        {top.length > 0 && (
          <Box {...CARD} flexDirection="column" gap={1} paddingY={1}>
            <Text dimColor size="caption">
              PROYECTOS
            </Text>
            {top.map(([name, min]) => (
              <Box key={name} flexDirection="column">
                <Box flexDirection="row" justifyContent="space-between">
                  <Text wrap="truncate">{name}</Text>
                  <Text dimColor>{duration(min)}</Text>
                </Box>
                {hasSvg ? (
                  <Svg
                    source={pill(min / top[0]![1], Math.round(barCells * PX_PER_CELL), '#e06c3c')}
                    alt={`${name}: ${duration(min)}`}
                  />
                ) : (
                  <Text color="#e06c3c">
                    {'━'.repeat(Math.max(1, Math.round((min / top[0]![1]) * barCells)))}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        )}

        <Text dimColor size="caption">
          {mode === 'repo' ? 'Solo este proyecto.' : 'Todos los proyectos.'} Consumo = entrada nueva
          + salida, no un límite; la caché se repite en cada turno. Todo se calcula en tu ordenador.
        </Text>
        <Box flexDirection="row" gap={1}>
          <Button
            key="scope"
            label={mode === 'repo' ? 'Ver todos' : 'Solo este proyecto'}
            hotkey="p"
            onPress={() => update($, scope, m => (m === 'repo' ? 'all' : 'repo'))}
          />
          <Button key="refresh" label="Actualizar" hotkey="r" onPress={() => refresh($)} />
          <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
