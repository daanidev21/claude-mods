# modelo-justo

[Español](README.md) | English

Picks the model of subagents according to the task.

When Claude launches a subagent without naming a model, it gets Haiku, Sonnet or
Opus based on its short description. A model that is already set, or a fork, is
respected. In `sugerir` (suggest) mode the choice is only noted.

Opus has its own policy, changed in the panel:

- **Permitir** (allow): assigned as is.
- **Avisar** (warn): assigned, and a notice appears (the default).
- **Preguntar** (ask): before using Opus a dialog opens, and the subagent waits for
  your answer.
- **Limitar** (limit): Opus is never used for subagents; Sonnet is the ceiling.

`/modelo-justo` opens the panel. `on`, `off`, `auto`, `sugerir`,
`opus permitir|avisar|preguntar|limitar` and `lista` (list) also work.

## What is sent

Classification is a call to a small model through your session's client. Only the
short description of the subagent is sent, never the task text or your messages.
With `/modelo-justo off` no call is made.
