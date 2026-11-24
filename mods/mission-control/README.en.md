# mission-control

[Español](README.md) | English

A panel to understand what Claude is doing while it works: who spawned whom, what
each one is doing and which files it touches.

## Usage

`/mission` opens or closes the panel, with two tabs:

- **Agentes** (agents, `a`): a tree with the main session on top and the subagents
  hanging from it. Each one shows its state, time, how many tools it has used and
  what it is doing now, for example "leyendo src/App.swift" (reading).
- **Archivos** (files, `f`): the files read (`○`) or edited (`✎`) and who touched
  them.

`/mission archivos` and `/mission agentes` open each tab directly.

## Limits

- It only sees what happened since the mod was loaded.
- It does not show reasoning, only which tool is used and on what.
- For terminal commands it shows the description or the program name, not the full
  line.

## Privacy

It only reads what the engine reports. It calls no model and makes no requests.
