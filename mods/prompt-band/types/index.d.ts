export type Limit = {
  kind: string
  percentUsed: number
  resetsAt?: string
  // only on `context`: tokens used and the model's window
  tokens?: number
  window?: number
}
export type Limits = { at: number; items: Limit[] }

declare module 'claude-code' {
  interface PluginState {
    'prompt-band': {
      limits: Shaped<Limits | null>
      warned: Shaped<Record<string, number>>
    }
  }
}
