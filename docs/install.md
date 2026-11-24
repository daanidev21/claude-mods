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

## Instalarlos todos

macOS y Linux (terminal):

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

## macOS y Windows

Los mods funcionan en los dos. Lo único que cambia:

- **Python**: `heatmap` necesita Python 3. En macOS, `python3` (si falta,
  `xcode-select --install` o `brew install python`). En Windows, `python` o `py -3`
  (`winget install Python.Python.3.12`); si `python` abre la Microsoft Store,
  instálalo desde python.org.
- **Carpeta de configuración**: `~/.claude` en macOS y `%USERPROFILE%\.claude` en
  Windows. Si usas `CLAUDE_CONFIG_DIR`, se respeta.
- **Rutas en `/ramas`**: `/ramas ~/proyectos/api` en macOS y
  `/ramas C:\proyectos\api` o `/ramas ~\proyectos\api` en Windows.

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
