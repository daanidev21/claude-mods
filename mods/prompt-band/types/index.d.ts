export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Limits = { at: number; items: Limit[] }

declare module 'claude-code' {
  interface PluginState {
    'prompt-band': {
      limits: Shaped<Limits | null>
      warned: Shaped<Record<string, number>>
    }
  }
}
