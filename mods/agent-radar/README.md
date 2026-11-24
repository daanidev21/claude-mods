# agent-radar

Español | [English](README.en.md)

Una línea sobre el prompt por cada subagente en marcha, con su descripción, el
modelo, el tiempo, cuántas herramientas ha usado y lo que está haciendo ahora.
Al terminar queda 30 segundos con una marca y un aviso.

`/radar` abre un panel con todos y, al elegir uno, sus últimos mensajes.

Solo lee lo que el motor informa sobre los subagentes. No llama a ningún modelo ni
hace peticiones. De las llamadas a Bash guarda únicamente el nombre del programa,
no la línea de comandos.
