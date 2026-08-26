# Project Template

This repository is a reusable foundation for projects that need three things:

- an indexed, maintainable documentation process;
- a conceptual-domain-first architecture philosophy with ESLint enforcement;
- a repository-local Markplane development backlog.

It intentionally contains no product definition, product workspaces, runtime
code, technology selection, research, or backlog history. Add those only when a
new project has concrete requirements.

Start with [the docs overview](docs/README.md). Use
[the docs index](docs/_index.md) to route to the smallest relevant document.

## Development Tracking

The repository-local `.markplane/` project tracks development work. It is
planning state, not canonical repository truth or runtime product data.

```sh
markplane dashboard
markplane serve --open
markplane sync
markplane check
```

## Verification

```sh
pnpm lint
pnpm test
pnpm check
```

These commands verify the reusable architecture tooling. Workspace boundary
enforcement becomes active for each future workspace when that workspace adds
an explicit local `boundaries.config.mjs` map and registers it in
`eslint.config.mjs`.
