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
