# heatmap

[Español](README.md) | English

One square per day with the time you have spent in Claude Code, in the style of
GitHub contributions. Below it, your streak, your busiest day, token usage and
the time per project. `/heatmap` opens and closes the panel; the "Solo este
proyecto" (only this project) button filters by the current folder.

Active time is the time between messages, ignoring pauses of more than five
minutes.

## Token usage

Two cards show the tokens for today and for the whole period: new input plus
output, and, separately, what came from the cache. There are no prices, since with
a gateway or a custom model none would be reliable. It is not a limit either: the
cache repeats on every turn, which is why it is kept apart.

## Requirements

It needs Python 3. The mod tries `python`, `py -3` and `python3`, in that order.

- **macOS**: `python3 --version`. If you do not have it, `xcode-select --install`
  or `brew install python`.
- **Windows**: `python --version`. If it opens the Microsoft Store, install it from
  python.org or with `winget install Python.Python.3.12`, then reopen the terminal.

## Data

A Python script walks the session logs in `~/.claude/projects` and reads the time
of each message, the project folder name and the token counters of each reply. It
does not read the text of the conversations and makes no network requests. The
result is saved in `~/.claude/heatmap/ledger.json`, so older days stay there when
Claude Code deletes its logs.

On Windows that folder is `%USERPROFILE%\.claude`. `CLAUDE_CONFIG_DIR` is
respected.
