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

La ruta puede ser cualquier carpeta dentro de un repositorio, o `~` para tu
carpeta personal. Se guarda en local y aparece luego en el selector.

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

## Botones

- **Solo esta rama / Todas las ramas** (`t`): limita el gráfico a la rama actual.
- **Actualizar** (`r`): vuelve a leer el repositorio. Se refresca solo cada 10
  segundos mientras el panel está abierto.
- **Otro repo** (`n`): pasa al siguiente repositorio de los que has añadido.
- **Quitar** (`x`): olvida el repositorio que estás viendo.
- **Cerrar** (`q`).

## Límites

Enseña los últimos 60 commits. En la terminal el gráfico es una lista simple, sin
curvas. El panel solo lee: no cambia de rama ni toca el repositorio.

## Privacidad

Solo ejecuta `git log` y `git rev-parse` en local. No llama a ningún modelo ni
hace peticiones. Lo único que guarda son las rutas de los repositorios que
añades.
