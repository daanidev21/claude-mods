# heatmap

Español | [English](README.en.md)

Un cuadro por día con el tiempo que has pasado en Claude Code, al estilo de las
contribuciones de GitHub. Debajo, tu racha, el día más activo y el tiempo por
proyecto. `/heatmap` abre y cierra el panel; el botón «Solo este proyecto» filtra
por la carpeta actual.

El tiempo activo es el que hay entre mensajes, descartando pausas de más de cinco
minutos.

## Datos

Un script de Python recorre los logs de sesión de `~/.claude/projects` y lee solo
la hora de cada mensaje y el nombre de la carpeta del proyecto. No lee el texto
de las conversaciones y no hace peticiones de red. El resultado se guarda en
`~/.claude/heatmap/ledger.json`, para que los días antiguos sigan ahí cuando
Claude Code borre sus logs.
