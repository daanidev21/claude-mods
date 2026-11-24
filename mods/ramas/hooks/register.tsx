// Branch graph of the session's repository, drawn from `git log`.
import type { Register } from 'claude-code'

const PANE = 'ramas'
const LIMIT = 60
const PADV = 7
const CHIP_H = 25
const TXT_H = 18
const CHAR_W = 5.9
const CHIP_CHAR = 6.3
const COL_W = 18
const PAD = 14
const REFRESH_MS = 10_000
// pixels per cell across a pane body, measured on the desktop app
const PANE_CELL = 8.3
const COLORS = ['#38bdf8', '#e06c3c', '#22c55e', '#a78bfa', '#f59e0b', '#f472b6']
const SEP = '\u001f'
const STATUS_MS = 8_000
const PER_GROUP = 8

// working-tree status, as IntelliJ's commit view groups it
const GROUPS = [
  { id: 'conflict', title: 'CONFLICTOS', color: '#ef4444' },
  { id: 'staged', title: 'PREPARADOS PARA EL COMMIT', color: '#22c55e' },
  { id: 'modified', title: 'MODIFICADOS SIN PREPARAR', color: '#f59e0b' },
  { id: 'untracked', title: 'NUEVOS SIN SEGUIR', color: '#38bdf8' },
] as const
type GroupId = (typeof GROUPS)[number]['id']
type Entry = { code: string; path: string; from?: string }
type Snapshot = {
  branch: string
  upstream: string
  ahead: number
  behind: number
  files: Record<GroupId, Entry[]>
}
const CONFLICTS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])
const CARD = {
  backgroundColor: 'rgba(128,128,128,0.16)',
  borderStyle: 'round',
  borderDimColor: true,
  paddingX: 1,
} as const

// `git status --porcelain=v1 -z -b`: entries end in NUL, a rename carries its origin as the next entry
const parseStatus = (out: string): Snapshot => {
  const snap: Snapshot = {
    branch: '',
    upstream: '',
    ahead: 0,
    behind: 0,
    files: { conflict: [], staged: [], modified: [], untracked: [] },
  }
  const parts = out.split('\0')
  for (let i = 0; i < parts.length; i++) {
    const line = parts[i] ?? ''
    if (line === '') continue
    if (line.startsWith('## ')) {
      const head = line.slice(3)
      const counts = /\[(.*)\]$/.exec(head)
      const names = (counts ? head.slice(0, counts.index) : head).trim()
      if (counts) {
        snap.ahead = Number(/ahead (\d+)/.exec(counts[1] ?? '')?.[1] ?? 0)
        snap.behind = Number(/behind (\d+)/.exec(counts[1] ?? '')?.[1] ?? 0)
      }
      if (names.startsWith('HEAD (no branch)')) snap.branch = 'HEAD suelto'
      else if (names.startsWith('No commits yet on ')) snap.branch = names.slice('No commits yet on '.length)
      else {
        const [local = '', remote = ''] = names.split('...')
        snap.branch = local
        snap.upstream = remote
      }
      continue
    }
    const x = line[0] ?? ' '
    const y = line[1] ?? ' '
    const entry: Entry = { code: `${x}${y}`, path: line.slice(3) }
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') entry.from = parts[++i]
    if (x === '?' && y === '?') snap.files.untracked.push(entry)
    else if (CONFLICTS.has(`${x}${y}`)) snap.files.conflict.push(entry)
    else if (x !== '!') {
      if (x !== ' ') snap.files.staged.push({ ...entry, code: x })
      if (y !== ' ') snap.files.modified.push({ ...entry, code: y })
    }
  }

  return snap
}

const total = (s: Snapshot) => GROUPS.reduce((n, g) => n + s.files[g.id].length, 0)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const statusLine = (s: Snapshot): string => {
  const bits: string[] = []
  if (s.files.conflict.length) bits.push(`✖${s.files.conflict.length}`)
  if (s.files.staged.length) bits.push(`●${s.files.staged.length}`)
  if (s.files.modified.length) bits.push(`✎${s.files.modified.length}`)
  if (s.files.untracked.length) bits.push(`+${s.files.untracked.length}`)
  const sync = `${s.ahead ? ` ↑${s.ahead}` : ''}${s.behind ? ` ↓${s.behind}` : ''}`

  return `⎇ ${s.branch}${sync} ${bits.length ? bits.join(' ') : '✓'}`
}

const summary = (s: Snapshot) =>
  [
    plural(s.files.conflict.length, 'conflicto', 'conflictos'),
    plural(s.files.staged.length, 'preparado', 'preparados'),
    plural(s.files.modified.length, 'modificado', 'modificados'),
    plural(s.files.untracked.length, 'nuevo', 'nuevos'),
  ].join(' · ')

const STATUS_ARGS = ['--no-optional-locks', 'status', '--porcelain=v1', '-z', '-b', '-uall']

type Commit = {
  hash: string
  parents: string[]
  refs: string[]
  subject: string
  when: string
}
type Row = Commit & {
  col: number
  before: (string | null)[]
  parentCols: number[]
  width: number
}

// a remote branch at the same commit as its local one adds nothing
const collapse = (refs: string[]): string[] =>
  refs.filter(r => {
    const i = r.indexOf('/')
    if (r.startsWith('tag: ') || i < 0) return true

    return !refs.includes(r.slice(i + 1))
  })

const parseLog = (out: string): Commit[] =>
  out
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash = '', parents = '', refs = '', subject = '', when = ''] = line.split(SEP)

      return {
        hash,
        parents: parents.split(' ').filter(Boolean),
        refs: collapse(
          refs
            .split(', ')
            .map(r => r.trim().replace(/^HEAD -> /, ''))
            .filter(Boolean)
            .filter(r => r !== 'HEAD' && !r.endsWith('/HEAD')),
        ),
        subject,
        when,
      }
    })

// lane assignment: each lane waits for the commit it expects next
const layout = (commits: Commit[]): Row[] => {
  const lanes: (string | null)[] = []
  const rows: Row[] = []
  for (const c of commits) {
    const before = [...lanes]
    let col = lanes.indexOf(c.hash)
    if (col < 0) {
      col = lanes.indexOf(null)
      if (col < 0) col = lanes.length
    }
    for (let i = 0; i < lanes.length; i++) if (lanes[i] === c.hash) lanes[i] = null
    const parentCols: number[] = []
    c.parents.forEach((p, k) => {
      let j = lanes.indexOf(p)
      if (j < 0) {
        if (k === 0) j = col
        else {
          j = lanes.indexOf(null)
          if (j < 0) j = lanes.length
        }
        lanes[j] = p
      }
      parentCols.push(j)
    })
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop()
    rows.push({ ...c, col, before, parentCols, width: Math.max(before.length, lanes.length, col + 1) })
  }

  return rows
}

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s)

// greedy word wrap into at most two lines
const wrap = (text: string, first: number, rest: number): string[] => {
  if (text.length <= first) return [text]
  const words = text.split(' ')
  let a = ''
  let i = 0
  while (i < words.length && (a ? `${a} ${words[i]}` : words[i]).length <= first) {
    a = a ? `${a} ${words[i]}` : words[i]
    i++
  }
  if (!a) return [cut(text, first)]

  return [a, cut(words.slice(i).join(' '), rest)]
}

// one SVG per commit, so the pane can scroll row by row
const drawRows = (rows: Row[], width: number, head: string): string[] => {
  const lanes = Math.max(1, ...rows.map(r => r.width))
  const gw = PAD * 2 + (lanes - 1) * COL_W
  const x0 = gw + 8
  const x = (i: number) => PAD + i * COL_W
  const color = (i: number) => COLORS[i % COLORS.length]

  return rows.map(r => {
    const lines: string[] = []
    const labels: string[] = []
    const c = color(r.col)
    const whenW = r.when.length * 5.6 + 10
    const maxName = Math.floor((width - x0 - 22) / CHIP_CHAR)

    // branch names first, on their own line(s), whole unless one alone is too long
    const chipRows: { tx: number; w: number; name: string; isHead: boolean }[][] = []
    let cur: { tx: number; w: number; name: string; isHead: boolean }[] = []
    let tx = x0
    const room = width - whenW - 8
    for (const ref of r.refs.slice(0, 6)) {
      const name = cut(ref.replace(/^tag: /, '\u2691 '), maxName)
      const w = Math.round(name.length * CHIP_CHAR + 14)
      if (cur.length > 0 && tx + w > (chipRows.length === 0 ? room : width - 8)) {
        chipRows.push(cur)
        cur = []
        tx = x0
      }
      cur.push({ tx, w, name, isHead: ref === head })
      tx += w + 6
    }
    if (cur.length > 0) chipRows.push(cur)

    const hasChips = chipRows.length > 0
    const rest = Math.floor((width - x0 - 8) / CHAR_W)
    const firstMsg = hasChips ? rest : Math.floor((width - x0 - whenW - 8) / CHAR_W)
    const text = wrap(r.subject, firstMsg, rest)
    const height = PADV * 2 + chipRows.length * CHIP_H + text.length * TXT_H
    const mid = PADV + (hasChips ? CHIP_H : TXT_H) / 2

    const curve = (x1: number, y1: number, x2: number, y2: number) =>
      `M${x1} ${y1}C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`
    const path = (d: string, col: string) =>
      lines.push(`<path d="${d}" stroke="${col}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`)
    r.before.forEach((h, i) => {
      if (!h) return
      if (h === r.hash) path(x(i) === x(r.col) ? `M${x(i)} 0V${mid}` : curve(x(i), 0, x(r.col), mid), color(i))
      else path(`M${x(i)} 0V${height}`, color(i))
    })
    r.parentCols.forEach(j => {
      if (x(j) === x(r.col)) path(`M${x(r.col)} ${mid}V${height}`, color(j))
      else {
        const yb = Math.max(mid, height - 18)
        path(`M${x(r.col)} ${mid}V${yb}C${x(r.col)} ${yb + 9} ${x(j)} ${yb + 9} ${x(j)} ${height}`, color(j))
      }
    })
    const dot = r.parents.length > 1
      ? `<circle cx="${x(r.col)}" cy="${mid}" r="5" fill="#1b1b1b" stroke="${c}" stroke-width="2.8"/>`
      : `<circle cx="${x(r.col)}" cy="${mid}" r="5" fill="${c}"/>`

    chipRows.forEach((row, n) => {
      const cy = PADV + n * CHIP_H + CHIP_H / 2
      for (const ch of row) {
        labels.push(
          `<rect x="${ch.tx}" y="${cy - 9.5}" width="${ch.w}" height="19" rx="9.5" fill="${ch.isHead ? c : 'none'}" stroke="${c}" stroke-width="1.4"/>` +
            `<text x="${ch.tx + ch.w / 2}" y="${cy + 4}" font-size="11" font-weight="600" text-anchor="middle" fill="${ch.isHead ? '#111' : c}">${esc(ch.name)}</text>`,
        )
      }
    })
    const top = PADV + chipRows.length * CHIP_H
    text.forEach((line, n) => {
      labels.push(`<text x="${x0}" y="${top + n * TXT_H + TXT_H / 2 + 4}" font-size="12" fill="#9ca3af">${esc(line)}</text>`)
    })
    labels.push(`<text x="${width - 6}" y="${mid + 3.5}" font-size="10" text-anchor="end" fill="#8a8f98">${esc(r.when)}</text>`)

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system,Helvetica,Arial,sans-serif">${lines.join('')}${dot}${labels.join('')}</svg>`
  })
}

const CURRENT = 'repo'
const SAVED = 'repos'
const MAX_REPOS = 8

const state = {
  at: 0,
  all: true,
  ok: true,
  rows: [] as Row[],
  head: '',
  note: '',
  repo: null as string | null,
  saved: [] as string[],
  session: '',
  snap: null as Snapshot | null,
  showFiles: true,
}

const base = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path

const git = async ($: any, argv: string[], repo: string | null = state.repo) => {
  const run = await $.process.run(['git', ...(repo ? ['-C', repo] : []), ...argv], { timeoutMs: 15_000 })
  if (run.exitCode !== 0) throw new Error(run.stderr.trim().split('\n')[0] || 'git falló')

  return run.stdout as string
}

const load = async ($: any) => {
  const saved = await $.store.get(SAVED)
  state.saved = Array.isArray(saved) ? (saved as string[]) : []
  const current = await $.store.get(CURRENT)
  state.repo = typeof current === 'string' ? current : null
  state.session = (await git($, ['rev-parse', '--show-toplevel'], null).catch(() => '')).trim()
}

const refresh = async ($: any) => {
  try {
    await load($)
    const format = ['%h', '%p', '%D', '%s', '%ar'].join('%x1f')
    const args = ['log', '--date-order', `-n${LIMIT}`, `--format=${format}`]
    if (state.all) args.splice(1, 0, '--all')
    const [out, branch, status] = await Promise.all([
      git($, args),
      git($, ['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => ''),
      git($, STATUS_ARGS).catch(() => null),
    ])
    state.snap = status === null ? null : parseStatus(status)
    state.rows = layout(parseLog(out))
    state.head = branch.trim()
    state.ok = true
    state.note = ''
  } catch (err) {
    state.rows = []
    state.snap = null
    state.ok = false
    state.note = err instanceof Error ? err.message : String(err)
  }
  state.at = Date.now()
  $.ui.status(state.snap ? statusLine(state.snap) : undefined)
}

// light refresh for the status line: no log, so it is cheap to run on a timer
const refreshStatus = async ($: any) => {
  try {
    await load($)
    state.snap = parseStatus(await git($, STATUS_ARGS))
  } catch {
    state.snap = null
  }
  $.ui.status(state.snap ? statusLine(state.snap) : undefined)
}

const select = async ($: any, repo: string | null) => {
  await $.store.set(CURRENT, repo)
  await refresh($)
  $.ui.invalidate('ui.render')
}

// no `sh` on Windows: ask cmd there
const homeDir = async ($: any): Promise<string> => {
  for (const argv of [['sh', '-c', 'printf %s "$HOME"'], ['cmd', '/c', 'echo %USERPROFILE%']]) {
    try {
      const run = await $.process.run(argv)
      const out = (run.stdout as string).trim()
      if (run.exitCode === 0 && out && !out.includes('%')) return out
    } catch {
      // not available here
    }
  }

  throw new Error('No se encontró la carpeta personal')
}

// `~` is the only shorthand; the repository root is what gets stored
const resolveRepo = async ($: any, raw: string) => {
  let path = raw.trim()
  if (path === '~' || path.startsWith('~/') || path.startsWith('~\\')) {
    path = (await homeDir($)) + path.slice(1)
  }

  return (await git($, ['rev-parse', '--show-toplevel'], path)).trim()
}

const remember = async ($: any, root: string) => {
  const next = [root, ...state.saved.filter(r => r !== root)].slice(0, MAX_REPOS)
  await $.store.set(SAVED, next)
  state.saved = next
}

// session first, then the saved ones; the next after the current wraps around
const cycle = (): (string | null)[] => [null, ...state.saved.filter(r => r !== state.session)]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command
      .register({
        name: 'ramas',
        description: 'Gráfico de ramas y commits del repositorio',
        argumentHint: '[ruta del repositorio | sesion | estado]',
      })
      .catch(() => {})
    await refreshStatus($)
    $.clock.every(STATUS_MS, async () => {
      await refreshStatus($)
      $.ui.invalidate('ui.render')
    })

    return next(e)
  })

  on('command.run', { command: 'ramas' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === '') {
      if ((await $.ui.panes()).some(p => p.id === PANE)) {
        await $.ui.close({ id: PANE })

        return { text: 'Ramas cerrado.' }
      }
      await refresh($)
      await $.ui.open({ id: PANE, title: 'Ramas' })

      return { text: 'Ramas abierto.' }
    }
    if (arg === 'estado') {
      await refreshStatus($)
      if (!state.snap) return { text: 'Ramas: no hay un repositorio git aquí.' }

      return { text: `${statusLine(state.snap)}\n${summary(state.snap)}` }
    }
    if (arg === 'sesion' || arg === 'sesión') {
      await select($, null)
      await $.ui.open({ id: PANE, title: 'Ramas' })

      return { text: 'Ramas: repositorio de esta sesión.' }
    }
    try {
      await load($)
      const root = await resolveRepo($, arg)
      await remember($, root)
      await select($, root === state.session ? null : root)
      await $.ui.open({ id: PANE, title: 'Ramas' })

      return { text: `Ramas: ${base(root)}.` }
    } catch (err) {
      return { text: `No es un repositorio git: ${err instanceof Error ? err.message : arg}` }
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Svg } = $.ui.resolve(e) as any
    if (Date.now() - state.at > REFRESH_MS) await refresh($)
    const hasSvg = e.surface === 'desktop' && Svg !== undefined
    // the pane's own width; a wider drawing would be shrunk, letters included
    const cols = (e.props as any)?.bodyColumns ?? (e as any).viewport?.columns ?? 60
    const width = Math.max(260, Math.round(cols * PANE_CELL) - 8)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text bold>{base(state.repo ?? state.session) || 'Sin repositorio'}</Text>
          {state.repo === null && <Text dimColor>esta sesión</Text>}
        </Box>
        {state.ok && state.snap && (
          <Box {...CARD} flexDirection="column" paddingY={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text bold color={total(state.snap) > 0 ? '#f59e0b' : '#22c55e'}>
                {total(state.snap) > 0 ? plural(total(state.snap), 'cambio', 'cambios') : '✓ Limpio'}
              </Text>
              <Text dimColor size="caption">
                {[
                  state.snap.upstream ? `→ ${state.snap.upstream}` : 'sin rama remota',
                  state.snap.ahead ? `${state.snap.ahead} por subir` : '',
                  state.snap.behind ? `${state.snap.behind} por bajar` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Box>
            {state.showFiles &&
              GROUPS.filter(g => state.snap!.files[g.id].length > 0).map(g => {
                const list = state.snap!.files[g.id]

                return (
                  <Box key={g.id} flexDirection="column">
                    <Text size="caption" bold color={g.color}>
                      {g.title} · {list.length}
                    </Text>
                    {list.slice(0, PER_GROUP).map((f, i) => (
                      <Box key={`${f.path}-${i}`} flexDirection="row" gap={1}>
                        <Box width={2}>
                          <Text bold color={g.color}>
                            {f.code === '??' ? '+' : f.code.trim()}
                          </Text>
                        </Box>
                        <Text wrap="truncate">{f.from ? `${f.path} ← ${f.from}` : f.path}</Text>
                      </Box>
                    ))}
                    {list.length > PER_GROUP && (
                      <Text dimColor size="caption">
                        … y {list.length - PER_GROUP} más
                      </Text>
                    )}
                  </Box>
                )
              })}
          </Box>
        )}
        {!state.ok && <Text dimColor>{state.note || 'No hay un repositorio git en esta carpeta.'}</Text>}
        {state.ok && state.rows.length === 0 && <Text dimColor>El repositorio aún no tiene commits.</Text>}
        {state.ok && state.rows.length > 0 && hasSvg && (
          <Box flexDirection="column">
            {drawRows(state.rows, width, state.head).map((source, i) => (
              <Svg key={String(i)} source={source} alt={state.rows[i]?.subject ?? 'commit'} />
            ))}
          </Box>
        )}
        {state.ok && state.rows.length > 0 && !hasSvg && (
          <Box flexDirection="column">
            {state.rows.map((r, i) => (
              <Text key={String(i)} wrap="truncate">
                {'│ '.repeat(r.col)}● {r.refs.length ? `[${r.refs.join(', ')}] ` : ''}
                {r.subject}
              </Text>
            ))}
          </Box>
        )}
        <Box flexDirection="row" gap={2}>
          <Button
            key="scope"
            label={state.all ? 'Solo esta rama' : 'Todas las ramas'}
            hotkey="t"
            onPress={async () => {
              state.all = !state.all
              await refresh($)
              $.ui.invalidate('ui.render')
            }}
          />
          <Button
            key="files"
            label={state.showFiles ? 'Ocultar archivos' : 'Ver archivos'}
            hotkey="f"
            onPress={() => {
              state.showFiles = !state.showFiles
              $.ui.invalidate('ui.render')
            }}
          />
          <Button
            key="refresh"
            label="Actualizar"
            hotkey="r"
            onPress={async () => {
              await refresh($)
              $.ui.invalidate('ui.render')
            }}
          />
          <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
        {(cycle().length > 1 || (state.repo !== null && state.repo !== state.session)) && (
          <Box flexDirection="row" gap={2}>
            {cycle().length > 1 && (
              <Button
                key="next"
                label="Otro repo"
                hotkey="n"
                onPress={async () => {
                  const list = cycle()
                  const at = list.indexOf(state.repo === state.session ? null : state.repo)
                  await select($, list[(at + 1) % list.length] ?? null)
                }}
              />
            )}
            {state.repo !== null && state.repo !== state.session && (
              <Button
                key="forget"
                label="Quitar"
                hotkey="x"
                onPress={async () => {
                  const gone = state.repo
                  const next = state.saved.filter(r => r !== gone)
                  await $.store.set(SAVED, next)
                  state.saved = next
                  await select($, null)
                }}
              />
            )}
          </Box>
        )}
        <Text dimColor size="caption">
          Añade otro repositorio con /ramas ruta
        </Text>
      </Box>
    )
  })
}
