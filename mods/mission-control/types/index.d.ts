export type MissionNode = {
  id: string
  parent: string
  label: string
  model?: string
  status: 'running' | 'done' | 'failed'
  startedAt: number
  endedAt?: number
  tools: number
  last: string
}
export type MissionFile = {
  path: string
  by: string[]
  isRead: boolean
  isEdited: boolean
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'mission-control': {
      nodes: Shaped<MissionNode[]>
      files: Shaped<MissionFile[]>
      view: Shaped<'agents' | 'files'>
      tick: Shaped<number>
    }
  }
}
