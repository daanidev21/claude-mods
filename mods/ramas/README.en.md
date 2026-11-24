# ramas

[Español](README.md) | English

A line graph of a repository's branches and commits, inside a Claude Code panel.
It shows at a glance how the repo looks: which branches exist, where they split and
where they merged.

## Usage

| Command | What it does |
| --- | --- |
| `/ramas` | Opens or closes the panel with the session's repository |
| `/ramas path` | Opens another repository, for example `/ramas ~/projects/api` |
| `/ramas sesion` | Goes back to the session's repository |
| `/ramas estado` | One-line summary of the changes, without opening the panel |

The path can be any folder inside a repository, or `~` for your home folder. On
Windows `C:\projects\api` or `~\projects\api` work. It is saved locally and then
shows up in the selector.

## How to read the graph

- Each **dot** is a commit, newest to oldest.
- Each **colored line** is a branch. It splits where it began and joins again where
  it was merged.
- A **hollow** dot is a merge commit.
- The **labels** on top give the branch name, or `⚑ v1.0` for a tag. The current
  branch is filled.
- If the local branch and the remote one are on the same commit, a single label is
  shown. If they are apart, one is ahead of the other.
- On the right of each commit, how long ago it was made.

## Change status

The status line always shows the working-tree state, panel open or not,
refreshed every 8 seconds:

```
⎇ main ↑2 ●1 ✎3 +1
```

| Symbol | Meaning |
| --- | --- |
| `⎇ branch` | Current branch |
| `↑n` / `↓n` | Commits to push / to pull against the remote branch |
| `●n` | Staged files (ready for the next commit) |
| `✎n` | Modified, not staged |
| `+n` | New files git does not track yet |
| `✖n` | Files in conflict |
| `✓` | Clean |

In the panel, above the graph, the files are grouped as in IntelliJ's commit view:
conflicts, staged, modified and new. **Ocultar archivos** (hide files, `f`) hides
them. It is read-only: it never runs `add` or `commit`.

## Buttons

- **Solo esta rama / Todas las ramas** (current branch only / all branches, `t`):
  limits the graph to the current branch.
- **Actualizar** (refresh, `r`): reads the repository again. It also refreshes
  itself every 10 seconds while the panel is open.
- **Otro repo** (next repo, `n`): moves to the next repository you have added.
- **Quitar** (remove, `x`): forgets the repository you are viewing.
- **Ocultar archivos / Ver archivos** (hide / show files, `f`): toggles the list of
  changes.
- **Cerrar** (close, `q`).

## Limits

It shows the latest 60 commits. In the terminal the graph is a simple list, with
no curves. The panel only reads: it does not switch branches or touch the
repository.

## Privacy

It only runs `git log`, `git status` and `git rev-parse` locally. It calls no model and makes no
requests. The only thing it stores is the paths of the repositories you add.
