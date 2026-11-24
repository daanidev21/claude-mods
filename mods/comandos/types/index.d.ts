export type Note = {
  id: string
  title: string
  command: string
}

declare module 'claude-code' {
  interface PluginState {
    comandos: Record<string, never>
  }
}
