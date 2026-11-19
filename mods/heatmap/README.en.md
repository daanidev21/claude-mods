# heatmap

[Español](README.md) | English

One square per day with the time you have spent in Claude Code, in the style of
GitHub contributions. Below it, your streak, your busiest day and the time per
project. `/heatmap` opens and closes the panel; the "Solo este proyecto" (only this
project) button filters by the current folder.

Active time is the time between messages, ignoring pauses of more than five
minutes.

## Data

A Python script walks the session logs in `~/.claude/projects` and reads only the
time of each message and the project folder name. It does not read the text of the
conversations and makes no network requests. The result is saved in
`~/.claude/heatmap/ledger.json`, so older days stay there when Claude Code deletes
its logs.
