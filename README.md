# lexcraft-web

The web interface of LexCraft and the site of lexcraft.it.

- `app/`: the React app (Vite, TypeScript): reader, workspace, dossier, forum, graph. lexcraft-core
  pins this repository as its submodule `apps/web` at one of its tags and builds the app into its
  ingress image; the desktop app will reuse it. `app/CLAUDE.md` describes it.
- `landing/`: the site of lexcraft.it, published by Vercel from `main`.
- `conventions/`: the submodule lexcraft-contracts, which the app's tests read.

```bash
cd app && npm ci && npm run test -- --run && npm run build && npm run lint
```

In development the app talks to the core's Python API (`:5000`) and server (`:3001`): run
lexcraft-core's `./start.sh --dev` with `LEXCRAFT_WEB_DIR` pointing to this repository's `app/`.

## Licence

The code in `app/` is MPL-2.0 (`LICENSE`). The LexCraft name, logo and images (in `app/` and
`landing/`) are all rights reserved. The fonts keep their own licences (SIL Open Font License 1.1,
whose texts travel with them).
