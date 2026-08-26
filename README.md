# Booking System

This repository defines the product and documentation foundation for a
deliberately simple course and module booking system. It currently contains:

- an authoritative, implementation-agnostic product specification;
- an indexed, maintainable documentation process;
- a conceptual-domain-first architecture philosophy with ESLint enforcement;
- and a repository-local Markplane development backlog.

It intentionally contains no product implementation, product workspace,
runtime code, technology selection, database design, API design, frontend
design, or infrastructure design.

Start with [the product specification](docs/product/README.md) for accepted
booking-system behavior or [the docs overview](docs/README.md) for the
repository documentation model. Use
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
