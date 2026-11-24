# agent-radar

[Español](README.md) | English

One line above the prompt for each running subagent, with its description, model,
time, how many tools it has used and what it is doing now. When it finishes it
stays for 30 seconds with a check mark and a notice.

`/radar` opens a panel with all of them and, when you pick one, its latest
messages.

It only reads what the engine reports about subagents. It calls no model and makes
no requests. For Bash calls it keeps only the program name, not the command line.
