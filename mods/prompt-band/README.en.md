# prompt-band

[Español](README.md) | English

A row above the text box with three meters and shortcuts to the other mods.

## What it shows

- **5h and 7d**: how much of each usage window you have used and how long until it
  resets (`↻ 4h 25m`).
- **ctx**: how full the conversation's context window is.
- **Shortcuts**: one button for each mod of this collection that you have
  installed (`heatmap`, `agent-radar`, `mission-control`, `modelo-justo`,
  `comandos` and `ramas`). They open or close their panel.

## How it behaves

- Each meter goes from green to orange at 75% and to red at 90%. Going past 90%
  shows a notice, once per window.
- 5h and 7d are always shown, greyed out with a dash until the first reading
  arrives. Limits arrive with the reply to each message, and the last known
  reading is kept.
- When space is tight, for example with panels open beside it, the countdown is
  dropped and the bar uses that room.
- On the desktop app the bars are pills drawn in SVG. In the terminal they are
  text bars.

## Privacy

It uses only the figures the session already knows. It reads no files and makes
no requests.
