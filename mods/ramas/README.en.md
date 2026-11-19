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

The path can be any folder inside a repository, or `~` for your home folder. It is
saved locally and then shows up in the selector.

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

## Buttons

- **Solo esta rama / Todas las ramas** (current branch only / all branches, `t`):
  limits the graph to the current branch.
- **Actualizar** (refresh, `r`): reads the repository again. It also refreshes
  itself every 10 seconds while the panel is open.
- **Otro repo** (next repo, `n`): moves to the next repository you have added.
- **Quitar** (remove, `x`): forgets the repository you are viewing.
- **Cerrar** (close, `q`).

## Limits

It shows the latest 60 commits. In the terminal the graph is a simple list, with
no curves. The panel only reads: it does not switch branches or touch the
repository.

## Privacy

It only runs `git log` and `git rev-parse` locally. It calls no model and makes no
requests. The only thing it stores is the paths of the repositories you add.
