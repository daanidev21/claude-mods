import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'ramas',
  component: 'Pane',
  requestId: 'ramas',
  props: {
    title: 'Ramas',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

// what `git status --porcelain=v1 -z -b -uall` printed in a scratch repo
const STATUS = [
  '## main...origin/main [ahead 2, behind 1]',
  'MM a.txt',
  ' M b.txt',
  'UU c.txt',
  'R  new.txt',
  'old.txt',
  '?? dir/n.txt',
  '',
].join('\0')

const LOG = 'abc1234\x1f\x1fmain, origin/main\x1finit\x1f1 hour ago\n'

const engine = (on: any, status: string) => {
  on('command.register', () => ({ value: { command: 'ramas' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('process.run', (_: any, e: any) => {
    const argv: string[] = e.argv
    const stdout = argv.includes('status') ? status : argv.includes('log') ? LOG : '/repo\n'

    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.status', () => ({ value: undefined }))
  on('clock.every', () => ({ value: { cancel: () => {} } }))
}

test('the pane lists staged, modified, conflicted and new files, on every surface', async ($, on) => {
  engine(on, STATUS)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect((await ui.find({ type: 'Text', text: /PREPARADOS/ }))?.text).toContain('PREPARADOS PARA EL COMMIT')
    expect((await ui.find({ type: 'Text', text: /MODIFICADOS/ }))?.text).toContain('MODIFICADOS SIN PREPARAR')
    expect((await ui.find({ type: 'Text', text: /CONFLICTOS/ }))?.text).toContain('CONFLICTOS')
    expect((await ui.find({ type: 'Text', text: /NUEVOS/ }))?.text).toContain('NUEVOS SIN SEGUIR')
    expect((await ui.find({ type: 'Text', text: /6 cambios/ }))?.text).toBe('6 cambios')
    await ui.unmount()
  }
})

test('a clean tree says so', async ($, on) => {
  engine(on, '## main\0')
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  expect((await ui.find({ type: 'Text', text: /Limpio/ }))?.text).toBe('✓ Limpio')
  await ui.unmount()
})
