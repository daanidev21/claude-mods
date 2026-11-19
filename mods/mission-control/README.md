# mission-control

Español | [English](README.en.md)

Panel para entender qué hace Claude mientras trabaja: quién lanzó a quién, qué
está haciendo cada uno y qué archivos toca.

## Uso

`/mission` abre o cierra el panel, con dos pestañas:

- **Agentes** (`a`): un árbol con la sesión principal arriba y los subagentes
  colgando de ella. Cada uno muestra su estado, el tiempo, cuántas herramientas
  lleva y lo que hace ahora, por ejemplo «leyendo src/App.swift».
- **Archivos** (`f`): los archivos leídos (`○`) o editados (`✎`) y quién los tocó.

`/mission archivos` y `/mission agentes` abren directamente cada pestaña.

## Límites

- Solo ve lo ocurrido desde que el mod se cargó.
- No muestra el razonamiento, solo qué herramienta se usa y sobre qué.
- De los comandos de terminal enseña la descripción o el nombre del programa, no
  la línea completa.

## Privacidad

Solo lee lo que el motor informa. No llama a ningún modelo ni hace peticiones.
