export type Row = {
  d: string
  p: string
  n: string
  min: number
  s: number
  // tokens of the day: new input (uncached + cache writes), cache reads, output.
  // Absent on days stored before tokens were counted.
  ti?: number
  tc?: number
  to?: number
}

declare module 'claude-code' {
  interface PluginState {
    heatmap: {
      rows: Shaped<Row[] | null>
      scope: Shaped<'all' | 'repo'>
      error: Shaped<string>
    }
  }
}
