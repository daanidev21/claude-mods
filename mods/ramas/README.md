# ramas

Español | [English](README.en.md)

Gráfico de líneas con las ramas y los commits de un repositorio, dentro de un
panel de Claude Code. Sirve para ver de un vistazo cómo está el repo: qué ramas
hay, dónde se separaron y dónde se unieron.

## Uso

| Comando | Qué hace |
| --- | --- |
| `/ramas` | Abre o cierra el panel con el repositorio de la sesión |
| `/ramas ruta` | Abre otro repositorio, por ejemplo `/ramas ~/proyectos/api` |
| `/ramas sesion` | Vuelve al repositorio de la sesión |
| `/ramas estado` | Resumen de cambios en una línea, sin abrir el panel |

La ruta puede ser cualquier carpeta dentro de un repositorio, o `~` para tu
carpeta personal. En Windows vale `C:\proyectos\api` o `~\proyectos\api`. Se guarda
en local y aparece luego en el selector.

## Cómo se lee el gráfico

- Cada **punto** es un commit, del más reciente al más antiguo.
- Cada **línea de color** es una rama. Se separa donde nació y vuelve a unirse
  donde se fusionó.
- Un punto **hueco** es un commit de fusión.
- Las **etiquetas** de arriba dan el nombre de la rama, o `⚑ v1.0` si es una
  versión. La rama actual va rellena.
- Si la rama local y la del servidor están en el mismo commit, sale una sola
  etiqueta. Si van separadas, una está por delante de la otra.
- A la derecha de cada commit, cuánto hace que se hizo.

## Estado de los cambios

La barra de estado muestra siempre, con el panel abierto o no, el estado del
árbol de trabajo. Se actualiza cada 8 segundos:

```
⎇ main ↑2 ●1 ✎3 +1
```

| Símbolo | Significa |
| --- | --- |
| `⎇ rama` | Rama actual |
| `↑n` / `↓n` | Commits por subir / por bajar respecto a la rama remota |
| `●n` | Archivos preparados (listos para el siguiente commit) |
| `✎n` | Archivos modificados sin preparar |
| `+n` | Archivos nuevos que git aún no sigue |
| `✖n` | Archivos en conflicto |
| `✓` | Todo limpio |

En el panel, encima del gráfico, van los archivos agrupados como en la vista de
commit de IntelliJ: conflictos, preparados, modificados y nuevos. Se pueden
ocultar con **Ocultar archivos** (`f`). Es de solo lectura: no hace `add` ni
`commit`.

## Botones

- **Solo esta rama / Todas las ramas** (`t`): limita el gráfico a la rama actual.
- **Actualizar** (`r`): vuelve a leer el repositorio. Se refresca solo cada 10
  segundos mientras el panel está abierto.
- **Otro repo** (`n`): pasa al siguiente repositorio de los que has añadido.
- **Quitar** (`x`): olvida el repositorio que estás viendo.
- **Ocultar archivos / Ver archivos** (`f`): muestra u oculta la lista de cambios.
- **Cerrar** (`q`).

## Límites

Enseña los últimos 60 commits. En la terminal el gráfico es una lista simple, sin
curvas. El panel solo lee: no cambia de rama ni toca el repositorio.

## Privacidad

Solo ejecuta `git log`, `git status` y `git rev-parse` en local. No llama a ningún
modelo ni hace peticiones. Lo único que guarda son las rutas de los repositorios que
añades.
