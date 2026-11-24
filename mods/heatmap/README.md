# heatmap

Español | [English](README.en.md)

Un cuadro por día con el tiempo que has pasado en Claude Code, al estilo de las
contribuciones de GitHub. Debajo, tu racha, el día más activo, el consumo de
tokens y el tiempo por proyecto. `/heatmap` abre y cierra el panel; el botón
«Solo este proyecto» filtra por la carpeta actual.

El tiempo activo es el que hay entre mensajes, descartando pausas de más de cinco
minutos.

## Consumo

Dos tarjetas muestran los tokens de hoy y de todo el periodo: la entrada nueva
más la salida, y aparte lo que viene de la caché. No hay precios, porque con un
gateway o un modelo propio no habría ninguno fiable. Tampoco es un límite: la
caché se repite en cada turno, y por eso va separada.

## Requisitos

Necesita Python 3. El mod prueba `python`, `py -3` y `python3`, por ese orden.

- **macOS**: `python3 --version`. Si no lo tienes, `xcode-select --install` o
  `brew install python`.
- **Windows**: `python --version`. Si abre la Microsoft Store, instálalo desde
  python.org o con `winget install Python.Python.3.12`, y reabre la terminal.

## Datos

Un script de Python recorre los logs de sesión de `~/.claude/projects` y lee la
hora de cada mensaje, el nombre de la carpeta del proyecto y los contadores de
tokens de cada respuesta. No lee el texto de las conversaciones y no hace
peticiones de red. El resultado se guarda en `~/.claude/heatmap/ledger.json`,
para que los días antiguos sigan ahí cuando Claude Code borre sus logs.

En Windows esa carpeta es `%USERPROFILE%\.claude`. Si usas `CLAUDE_CONFIG_DIR`, se
respeta.
