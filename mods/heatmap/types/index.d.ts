export type Row = { d: string; p: string; n: string; min: number; s: number }

declare module 'claude-code' {
  interface PluginState {
    heatmap: {
      rows: Shaped<Row[] | null>
      scope: Shaped<'all' | 'repo'>
      error: Shaped<string>
    }
  }
}
