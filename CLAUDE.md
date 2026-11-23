# CLAUDE.md — lexcraft-web

The web interface of LexCraft. `app/CLAUDE.md` is the guide to the app; this file holds the rules of
the repository. Paths written `apps/server/…`, `services/…` or `infra/…` in the app's documents are
lexcraft-core's.

## Layout

| Path | What |
| --- | --- |
| `app/` | the React app; lexcraft-core pins this repository as `apps/web` at a tag and builds `app/` into its ingress (G-603) |
| `landing/` | the site of lexcraft.it; Vercel publishes `main` with Root Directory `landing`, so a push to `main` is a deploy |
| `conventions/` | submodule: lexcraft-contracts (below) |

## Commands

```bash
cd app && npm ci
npm --prefix app run test -- --run      # the web tests
npm --prefix app run build              # tsc -b + vite: the real type-check
npm --prefix app run lint
```

A bare `tsc --noEmit` does not walk the project references and reports a false green. For a browser
pass the app needs the core: lexcraft-core's `./start.sh --dev` with `LEXCRAFT_WEB_DIR` set to this
repository's `app/`.

## Rule 23 holds here too

Highlights and notes are anchored by `(startOffset, text)` in a projection of `article_text` where
only `\n` is invisible; the renderer must never add, drop or change a character, and drops a mark
silently when the stored text is not the slice at its offset (`app/CLAUDE.md`, lexcraft-core's root
`CLAUDE.md`). The server and the web meet in `conventions/contract/anchors.json`: the web's
`anchorsContract.test.ts` checks that it draws every passage there.

## Releases and the note

The note for users (`app/src/content/novita/X.Y.Z.md`) is named after the **product's** version, the
core's `version.txt` (G-604): the core's release fails without it in the web it pins, so a release of
the core alone needs a release of the web for its note.

## `conventions/` is a submodule: lexcraft-contracts

The convention for legal sources and the contract the core, the web and the MCP server each assert
(`conventions/sources/README.md`, `conventions/contract/README.md`). It is read, never edited, here:
a change is a pull request in LexCraft-IT/lexcraft-contracts first, then the core moves its
submodule and fixes its side, then this repository moves its own (`git -C conventions fetch && git
-C conventions checkout <commit>`, committed as one change). Clone with `--recurse-submodules`, or
run `git submodule update --init --recursive`; a test that cannot find `conventions/` fails, it never
skips. The job «Contract» of CI warns when the submodule is behind lexcraft-contracts' `develop`.

## Git flow (as in lexcraft-core, `docs/git-workflow.md` there)

- `develop` is where work lands and the default branch; `main` is the released version.
- Branch from `develop` (`feat/`, `fix/`, `refactor/`, `chore/`, `docs/`), open a pull request into
  `develop`, merge it with a merge commit titled `merge: <branch> — <what changes>` once CI is green.
- Review is requested, never awaited (`.github/CODEOWNERS`).
- The ruleset refuses pushes to `main` and `develop` and any merge whose CI is not green; the shared
  hook (`.claude/settings.json`) refuses commits on them.
- A release is a pull request `develop → main`, then a tag `vX.Y.Z` on `main`. This repository has its
  own version (`version.txt`, G-597): the product's version is the core's, which pins this repository
  at one of its tags.

## Rules

- **Public repository.** Nothing private enters it: no notes from the owners' workspaces, no
  infrastructure addresses, no personal paths or names, no secrets. `.env` files are never committed
  and Claude does not read them.
- English for code, comments, commits and documentation; the people who develop here are lawyers
  first: say plainly when a change carries an architectural or security risk.
