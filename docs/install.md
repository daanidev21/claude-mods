# Instalación

Español | [English](install.en.md)

Volver al [README](../README.md).

## Con el marketplace

```sh
claude plugin marketplace add daanidev21/claude-mods
claude plugin install heatmap@claude-mods
```

Cada mod se instala por separado. Con `--scope` eliges dónde:

- `user`: todos tus proyectos (por defecto)
- `local`: solo el proyecto actual, sin tocar los ajustes que se suben al repositorio
- `project`: el proyecto actual, guardado en `.claude/settings.json`

```sh
claude plugin install heatmap@claude-mods --scope local
```

En la app de escritorio, el comando `/plugin` no está disponible. Usa el botón
`+` junto al cuadro de texto, luego Plugins, «Add marketplace» con
`daanidev21/claude-mods` y «Add plugin».

## Probar sin instalar

```sh
git clone https://github.com/daanidev21/claude-mods && cd claude-mods
claude --plugin-dir mods/heatmap
```

## Actualizar

```sh
claude plugin marketplace update claude-mods
claude plugin update heatmap@claude-mods
```

## Desinstalar

```sh
claude plugin uninstall heatmap@claude-mods
```
