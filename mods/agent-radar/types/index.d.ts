export type RadarAgent = {
  id: string
  description: string
  type: string
  model?: string
  status: 'running' | 'done' | 'failed'
  startedAt: number
  endedAt?: number
  tools: number
  last: string
}

declare module 'claude-code' {
  interface PluginState {
    'agent-radar': {
      agents: Shaped<RadarAgent[]>
      selected: Shaped<string | null>
      tick: Shaped<number>
    }
  }
}
