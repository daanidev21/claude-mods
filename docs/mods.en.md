# The mods in detail

[Español](mods.md) | English

Back to the [README](../README.en.md).

Built and tested with Claude Code 2.1.326 on macOS and Windows. Screenshots use sample data. The
panels and rounded bars are designed for the desktop app; in the terminal the mods
work with a simpler version. The interface text of the mods is in Spanish.

| Mod | What it does | Command |
|---|---|---|
| [prompt-band](#prompt-band) | 5h and 7d limits, context and shortcuts above the prompt | |
| [heatmap](#heatmap) | Activity map by day, with streak and time per project | `/heatmap` |
| [agent-radar](#agent-radar) | One line for each running subagent | `/radar` |
| [mission-control](#mission-control) | Subagent tree and the files they touch | `/mission` |
| [modelo-justo](#modelo-justo) | Picks Haiku, Sonnet or Opus for each subagent, with a policy for Opus | `/modelo-justo` |
| [comandos](#comandos) | Per-project command notebook with a copy button | `/comandos` |
| [ramas](#ramas) | Line graph of the repository's branches and commits | `/ramas` |

## prompt-band

<img src="../images/prompt-band.png" width="560" alt="prompt-band with limits">

A row above the text box with meters and shortcuts.

- **5h and 7d**: how much of each usage window of your subscription you have
  used, and how long until it resets (`↻ 4h 25m`).
- **ctx**: how full the conversation's context window is, with the tokens used and
  the model's window (`82k/200k`).

The meters turn from green to orange and red. 5h and 7d do so at 75% and 90%; the
context earlier (65% and 80%), since it auto-compacts well before 100%. Reaching
the red threshold shows a notice, once per window. On the right there is one
button for each installed mod of this collection, which opens or closes its panel.

**With and without limits.** The mod adapts on its own. On a subscription account
5h and 7d are shown with the countdown. On an account without limits (API key,
Bedrock, Vertex, a gateway or a company account) only the context is shown, and
the 5h and 7d cards do not appear instead of sitting empty. As soon as the account
reports limits for the first time, they switch on.

<img src="../images/prompt-band-sin-limites.png" width="560" alt="prompt-band without limits">

On the desktop app the bars are pills drawn in SVG; in the terminal they are
text bars. In a narrow window, or with panels open beside it, the countdown is
dropped and the bar uses that space, with the percentage next to it.

Limits arrive with the reply to each message. In a new or resumed session, 5h and
7d show greyed out with a dash until the first reply, and the last known reading
is kept.

It reads no files and makes no requests: it uses the figures the session already
has.

## heatmap

<img src="../images/heatmap.png" width="560" alt="heatmap">

One square per day with the time you have spent in Claude Code, like GitHub
contributions. Below it, three cards (active time, streak and busiest day), two
cards with token usage and the projects with the most time.

- `/heatmap` opens and closes the panel.
- "Solo este proyecto" (only this project) filters by the current folder;
  "Actualizar" (refresh) recalculates.

Active time is the time between messages, ignoring pauses of more than five
minutes. If two sessions run at once, both count.

**Token usage.** The "Consumo hoy" (today) and "Consumo · N sem." (N weeks) cards
add up new input plus output; what comes from the cache is kept apart. There are
no prices, since with a gateway or a custom model none would be reliable. It is
not a limit: the cache repeats on every turn.

**Data.** A Python script walks the logs in `~/.claude/projects` and reads the time
of each message, the project folder name and the token counters of each reply. It
does not read the text of conversations or make network requests. The result is
saved in `~/.claude/heatmap/ledger.json`: Claude Code deletes its logs after a
while, and this way older days do not vanish from the map.

**Python.** It needs Python 3. The mod tries `python`, `py -3` and `python3`, in
that order. On macOS `python3` is usually enough (if it is missing,
`xcode-select --install` or `brew install python`). On Windows, if `python` opens
the Microsoft Store, install it from python.org or with
`winget install Python.Python.3.12` and reopen the terminal. `CLAUDE_CONFIG_DIR` is
respected; on Windows the default folder is `%USERPROFILE%\.claude`.

## agent-radar

<img src="../images/agent-radar.png" width="560" alt="agent-radar">

One line above the prompt for each running subagent: description, model, time,
number of tools used and what it is doing now. When one finishes it stays for 30
seconds with a check mark and a notice appears.

`/radar` opens a panel with all the session's subagents; pick one to see its
latest messages.

It only reads what the engine reports about subagents. It calls no model and
makes no requests. For Bash calls it keeps only the program name, never the
command line, so a token typed in it is not stored. It does not follow background
commands.

## mission-control

<img src="../images/mission-control.png" width="560" alt="mission-control">

`/mission` opens a panel with two tabs:

- **Agentes** (agents): the tree of who spawned whom, with what each one is doing
  and how many tools it has used.
- **Archivos** (files): the files read or edited and which agent touched them.

`/mission archivos` opens the second one directly. It only reads what the engine
reports; it calls no model and makes no requests.

## modelo-justo

<img src="../images/modelo-justo.png" width="560" alt="modelo-justo">

Picks the model of subagents according to the task.

When Claude launches a subagent without naming a model, it gets Haiku, Sonnet or
Opus based on its short description. A model that is already set, or a fork, is
respected. In `sugerir` (suggest) mode the choice is only noted in the panel's
list.

**Opus.** Since it is the model that costs the most, it has its own policy,
changed in the panel:

- **Permitir** (allow): assigned as is.
- **Avisar** (warn): assigned, and a notice appears.
- **Preguntar** (ask): before using Opus a dialog opens with three answers (allow
  Opus, use Sonnet or use Haiku). The subagent waits for your answer with no time
  limit: if you leave Claude working unattended, pick Limitar or Avisar.
- **Limitar** (limit, the default): Opus is never used for subagents; Sonnet is the
  ceiling. It is the default because some gateways do not serve Opus to subagents,
  and the agent would fail instead of falling back to another model. A policy you
  had already chosen is kept.

`/modelo-justo` opens a panel to turn it on, choose the mode, choose the Opus
policy and see the latest picks. `on`, `off`, `auto`, `sugerir`,
`opus permitir|avisar|preguntar|limitar` and `lista` also work. The state is
remembered between sessions.

**What is sent.** Classification is a call to a small model through your session's
client. Only the short description of the subagent is sent, never the task text
or your messages. With `/modelo-justo off` no call is made.

**Known limit.** A plugin cannot change the model of the main conversation, only
that of subagents. That is why this mod does not act on your messages.

## comandos

`/comandos` opens a panel with the saved commands of the current project. Each
note has a title, the command below it and a button to copy it.

To add one, type the title, press Enter, type the command and press Enter. Each
project has its own notes, saved locally. It calls no model and makes no
requests.

## ramas

<img src="../images/ramas.png" width="480" alt="ramas">

`/ramas` opens a panel with the line graph of the session's repository: one dot
per commit, one colored line per branch, and the branch names and tags above each
commit. Merge commits have a hollow dot and the current branch is filled.

It shows the latest 60 commits across all branches, and a button switches to the
current branch only. If the local branch and the remote one match, a single label
is shown.

**Change status.** The status line always shows the working-tree state, panel open
or not (`⎇ main ↑2 ●1 ✎3 +1`), refreshed every 8 seconds. `↑n` and `↓n` are the
commits to push and to pull, `●` the staged files, `✎` the modified ones, `+` the
new files git does not track yet, `✖` the ones in conflict and `✓` a clean tree. In
the panel, above the graph, those files are grouped as in IntelliJ's commit view,
and the "Ocultar archivos" (hide files) button hides them. `/ramas estado` gives a
one-line summary without opening the panel. It is read-only: it never runs `add`
or `commit`.

By default it reads the repository of the session's folder. `/ramas path` adds
another repository (it accepts `~`; on Windows `C:\projects\api` works) and opens
it; the "Otro repo" (next repo) button cycles through the ones you have added,
"Quitar" (remove) forgets the current one, and `/ramas sesion` goes back to the
session's. Paths are saved locally.

It only reads `git log`, `git status` and `git rev-parse` locally, does not modify
the repository, calls no model and makes no requests.
