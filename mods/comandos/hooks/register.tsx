// Command notes per project: a title, the command below it and a copy button.
import type { Register } from 'claude-code'

import type { Note } from '../types'

const PANE = 'comandos'
const MAX_NOTES = 100
const CARD = {
  backgroundColor: 'rgba(128,128,128,0.16)',
  borderStyle: 'round',
  borderDimColor: true,
  paddingX: 1,
} as const

const draft = { title: '', gen: 0 }

const storeKey = async ($: any) => `notes:${await $.session.cwd()}`

const notesOf = async ($: any): Promise<Note[]> => {
  const stored = await $.store.get(await storeKey($))

  return Array.isArray(stored) ? (stored as Note[]) : []
}

const save = async ($: any, notes: Note[]) => {
  await $.store.set(await storeKey($), notes.slice(0, MAX_NOTES))
  $.ui.invalidate('ui.render')
}

const add = async ($: any, command: string) => {
  const text = command.trim()
  if (!text) return
  const title = draft.title.trim() || text.split('\n')[0].slice(0, 40)
  const notes = await notesOf($)
  await save($, [{ id: String(Date.now()), title, command: text }, ...notes])
  draft.title = ''
  draft.gen += 1
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command
      .register({ name: 'comandos', description: 'Comandos guardados del proyecto' })
      .catch(() => {})

    return next(e)
  })

  on('command.run', { command: 'comandos' }, async $ => {
    if ((await $.ui.panes()).some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })

      return { text: 'Comandos cerrado.' }
    }
    await $.ui.open({ id: PANE, title: 'Comandos' })

    return { text: 'Comandos abierto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e) as any
    const notes = await notesOf($)

    return (
      <Box flexDirection="column" gap={2}>
        <Box {...CARD} flexDirection="column" gap={1} paddingY={1}>
          <Text dimColor size="caption">
            NUEVO COMANDO
          </Text>
          <Input
            key={`title-${draft.gen}`}
            placeholder="Para qué sirve"
            onInput={(v: string) => {
              draft.title = v
            }}
            onSubmit={(v: string) => {
              draft.title = v
              void $.ui.focus({ requestId: PANE, key: `cmd-${draft.gen}` })
            }}
          />
          <Input
            key={`cmd-${draft.gen}`}
            placeholder="El comando"
            submitLabel="guardar"
            onSubmit={(v: string) => void add($, v)}
          />
        </Box>

        {notes.length === 0 && (
          <Text dimColor>Aún no hay comandos guardados en este proyecto.</Text>
        )}
        {notes.map(n => (
          <Box key={n.id} {...CARD} flexDirection="column" gap={1} paddingY={1}>
            <Text bold>{n.title}</Text>
            <Box backgroundColor="rgba(128,128,128,0.22)" paddingX={1} paddingY={1}>
              <Text mono size="caption">
                {n.command}
              </Text>
            </Box>
            <Box flexDirection="row" gap={2}>
              <Button
                key={`copy-${n.id}`}
                label="Copiar"
                onPress={async (press: any) => {
                  const r = await $.ui.copy({ text: n.command, surface: press?.surface })
                  $.ui.toast(r.isCopied ? 'Comando copiado' : 'No se pudo copiar')
                }}
              />
              <Button
                key={`del-${n.id}`}
                label="Borrar"
                variant="secondary"
                onPress={async () => {
                  await save($, (await notesOf($)).filter(x => x.id !== n.id))
                }}
              />
            </Box>
          </Box>
        ))}

        <Box flexDirection="row" gap={1}>
          <Button key="close" label="Cerrar" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
