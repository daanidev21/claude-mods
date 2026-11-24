# modelo-justo

Español | [English](README.en.md)

Elige el modelo de los subagentes según la tarea.

Cuando Claude lanza un subagente sin nombrar modelo, se le asigna Haiku, Sonnet u
Opus a partir de su descripción corta. Un modelo ya indicado, o un fork, se
respeta. En modo `sugerir` la elección solo se anota.

Opus tiene una política propia, que se cambia en el panel:

- **Permitir**: se asigna sin más.
- **Avisar**: se asigna y sale un aviso.
- **Preguntar**: antes de usar Opus se abre un diálogo, y el subagente espera tu
  respuesta.
- **Limitar** (por defecto): nunca se usa Opus en subagentes; el máximo es Sonnet.

Limitar es el valor por defecto porque algunos gateways no sirven Opus a los
subagentes y el agente fallaría en lugar de caer a otro modelo. Si ya habías
elegido una política, se respeta. Con una cuenta que sí da acceso a Opus, cámbiala
en el panel.

`/modelo-justo` abre el panel. También funcionan `on`, `off`, `auto`, `sugerir`,
`opus permitir|avisar|preguntar|limitar` y `lista`.

## Qué se envía

La clasificación es una llamada a un modelo pequeño a través del cliente de tu
sesión. Se envía solo la descripción corta del subagente, nunca el texto de la
tarea ni tus mensajes. Con `/modelo-justo off` no se hace ninguna llamada.
