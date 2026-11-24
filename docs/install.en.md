# Installation

[Español](install.md) | English

Back to the [README](../README.en.md).

## With the marketplace

```sh
claude plugin marketplace add daanidev21/claude-mods
claude plugin install heatmap@claude-mods
```

Each mod is installed on its own. `--scope` chooses where:

- `user`: all your projects (the default)
- `local`: only the current project, without touching the settings that get committed to the repository
- `project`: the current project, stored in `.claude/settings.json`

```sh
claude plugin install heatmap@claude-mods --scope local
```

In the desktop app the `/plugin` command is not available. Use the `+` button
next to the text box, then Plugins, "Add marketplace" with
`daanidev21/claude-mods` and "Add plugin".

## Install them all

macOS and Linux (terminal):

```sh
for m in prompt-band heatmap agent-radar mission-control modelo-justo comandos ramas; do
  claude plugin install "$m@claude-mods"
done
```

Windows (PowerShell):

```powershell
foreach ($m in "prompt-band","heatmap","agent-radar","mission-control","modelo-justo","comandos","ramas") {
  claude plugin install "$m@claude-mods"
}
```

## macOS and Windows

The mods work on both. The only differences:

- **Python**: `heatmap` needs Python 3. On macOS, `python3` (if it is missing,
  `xcode-select --install` or `brew install python`). On Windows, `python` or
  `py -3` (`winget install Python.Python.3.12`); if `python` opens the Microsoft
  Store, install it from python.org.
- **Config folder**: `~/.claude` on macOS and `%USERPROFILE%\.claude` on Windows.
  `CLAUDE_CONFIG_DIR` is respected.
- **Paths in `/ramas`**: `/ramas ~/projects/api` on macOS and
  `/ramas C:\projects\api` or `/ramas ~\projects\api` on Windows.

## Try without installing

```sh
git clone https://github.com/daanidev21/claude-mods && cd claude-mods
claude --plugin-dir mods/heatmap
```

## Update

```sh
claude plugin marketplace update claude-mods
claude plugin update heatmap@claude-mods
```

## Uninstall

```sh
claude plugin uninstall heatmap@claude-mods
```
