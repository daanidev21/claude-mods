<h1 align="center">claude-mods</h1>
<p align="center"><b>Tu consumo, tus subagentes y tus comandos, a la vista en Claude Code.</b><br>Siete plugins pequeños e independientes. Instala solo los que quieras.</p>

<p align="center"><sub>Claude Code plugins: usage limits, subagent monitor, model picker, activity heatmap, git branch graph and saved commands. Everything runs locally.</sub></p>

<p align="center">Español | <a href="README.en.md">English</a></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-blue.svg" alt="MIT"></a>
  <img src="https://img.shields.io/badge/mods-7-informational.svg" alt="7 mods">
  <img src="https://img.shields.io/badge/datos-solo%20en%20local-success.svg" alt="Datos solo en local">
</p>

<p align="center"><img src="images/prompt-band.png" width="860" alt="Fila sobre el prompt con tres medidores (5h, 7d y contexto) y seis botones de acceso"></p>
<p align="center"><sub><b>prompt-band</b>: límites de uso, contexto y atajos a los demás paneles. Las imágenes usan datos de ejemplo.</sub></p>

## Instalación

Añade el marketplace una vez y luego instala los mods que te interesen:

```sh
claude plugin marketplace add daanidev21/claude-mods
claude plugin install prompt-band@claude-mods
```

Para instalarlos todos de una vez:

```sh
for m in prompt-band heatmap agent-radar mission-control modelo-justo comandos ramas; do
  claude plugin install "$m@claude-mods"
done
```

Otras formas de instalar, entre ellas probar un mod sin instalarlo, están en
[docs/install.md](docs/install.md).

## Los mods

<table>
  <tr>
    <td align="center" valign="top" width="50%"><a href="docs/mods.md#heatmap"><img src="images/cards/heatmap.png" alt="heatmap: cuadrícula de actividad por días con racha y tiempo por proyecto" width="400"></a><br><a href="docs/mods.md#heatmap"><b>heatmap</b></a><br>un cuadro por día</td>
    <td align="center" valign="top" width="50%"><a href="docs/mods.md#comandos"><img src="images/cards/comandos.png" alt="comandos: notas con título, comando y botón de copiar" width="400"></a><br><a href="docs/mods.md#comandos"><b>comandos</b></a><br>tus comandos del proyecto, a un clic</td>
  </tr>
  <tr>
    <td align="center" valign="top" width="50%"><a href="docs/mods.md#modelo-justo"><img src="images/cards/modelo-justo.png" alt="modelo-justo: panel con el modo, la política de Opus y los últimos subagentes" width="400"></a><br><a href="docs/mods.md#modelo-justo"><b>modelo-justo</b></a><br>el modelo de cada subagente</td>
    <td align="center" valign="top" width="50%"><a href="docs/mods.md#mission-control"><img src="images/cards/mission-control.png" alt="mission-control: árbol de subagentes con lo que hace cada uno" width="400"></a><br><a href="docs/mods.md#mission-control"><b>mission-control</b></a><br>quién lanzó a quién</td>
  </tr>
  <tr>
    <td align="center" valign="top" width="50%"><a href="docs/mods.md#ramas"><img src="images/cards/ramas.png" alt="ramas: gráfico de líneas con las ramas, fusiones y etiquetas de un repositorio" width="400"></a><br><a href="docs/mods.md#ramas"><b>ramas</b></a><br>el gráfico de ramas de tu repo</td>
    <td align="center" valign="top" width="50%"><a href="docs/mods.md#agent-radar"><img src="images/cards/agent-radar.png" alt="agent-radar: una línea por subagente en marcha sobre el prompt" width="400"></a><br><a href="docs/mods.md#agent-radar"><b>agent-radar</b></a><br>una línea por subagente</td>
  </tr>
</table>

| Mod | Qué hace | Comando |
| --- | --- | --- |
| [prompt-band](docs/mods.md#prompt-band) | Límites de 5h y 7d, contexto y atajos, en una fila sobre el prompt | |
| [heatmap](docs/mods.md#heatmap) | Un cuadro por día con tu tiempo en Claude Code, racha y proyectos | `/heatmap` |
| [agent-radar](docs/mods.md#agent-radar) | Una línea por cada subagente en marcha | `/radar` |
| [mission-control](docs/mods.md#mission-control) | Quién lanzó a quién y qué archivos tocó | `/mission` |
| [modelo-justo](docs/mods.md#modelo-justo) | El modelo de cada subagente, con política para Opus | `/modelo-justo` |
| [comandos](docs/mods.md#comandos) | Bloc de notas de comandos por proyecto, con botón de copiar | `/comandos` |
| [ramas](docs/mods.md#ramas) | Gráfico de líneas con las ramas y commits del repositorio | `/ramas` |

La descripción completa de cada uno, con qué datos usa, está en
[docs/mods.md](docs/mods.md). Cada mod tiene su README en `mods/<nombre>/`, también en inglés (`README.en.md`).

## Privacidad

Todo se ejecuta en tu equipo. Lo único que sale de él es la llamada de
clasificación de `modelo-justo`, que usa el cliente de tu propia sesión, solo con
la descripción corta de cada subagente, y se puede apagar. El detalle de qué se
envía está en [su sección](docs/mods.md#modelo-justo).

## Desarrollo

Cada mod es un plugin con su `.claude-plugin/plugin.json` y un módulo en
`hooks/`. Para comprobar uno:

```sh
claude plugin validate mods/prompt-band
```

Para probarlo sin instalar:

```sh
git clone https://github.com/daanidev21/claude-mods && cd claude-mods
claude --plugin-dir mods/prompt-band
```

## Licencia

[MIT](LICENSE)
