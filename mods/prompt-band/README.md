# prompt-band

Español | [English](README.en.md)

Una fila encima de la barra de escritura con tres medidores y atajos a los demás
mods.

## Qué muestra

- **5h y 7d**: lo que llevas gastado de cada ventana de uso y cuánto falta para
  que se reinicie (`↻ 4h 25m`).
- **ctx**: lo llena que está la ventana de contexto de la conversación.
- **Atajos**: un botón por cada mod de esta colección que tengas instalado
  (`heatmap`, `agent-radar`, `mission-control`, `modelo-justo`, `comandos` y
  `ramas`). Abren o cierran su panel.

## Cómo se comporta

- Cada medidor pasa de verde a naranja al 75% y a rojo al 90%. Al pasar del 90%
  sale un aviso, una sola vez por ventana.
- 5h y 7d salen siempre, apagados con un guion hasta que llega la primera lectura.
  Los límites llegan con la respuesta de cada mensaje, y se conserva la última
  lectura conocida.
- Si el espacio es justo, por ejemplo con paneles abiertos al lado, se quita la
  cuenta atrás y la barra aprovecha ese sitio.
- En la app de escritorio las barras son píldoras dibujadas en SVG. En la
  terminal son barras de texto.

## Privacidad

Usa solo las cifras que la sesión ya conoce. No lee archivos ni hace peticiones.
