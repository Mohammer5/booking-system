# Booking System

This repository contains the product specification and the first locally
complete application foundation for a deliberately simple course and module
booking system. It currently includes:

- an authoritative, implementation-agnostic product specification;
- an indexed, maintainable documentation process;
- a conceptual-domain-first architecture philosophy with ESLint enforcement;
- a locally runnable React/Vite and Cloudflare Worker application with D1;
- the first-Admin bootstrap vertical slice and its booking-domain package;
- GitHub Actions verification for pull requests and `main`; and
- a repository-local Markplane development backlog.

The implemented local foundation does not include production identity-provider
integration, remote Cloudflare resources, a release workflow, or a production
deployment. Those remain explicitly deferred; local acceptance is not release
approval.

Start with [the product specification](docs/product/README.md) for accepted
booking-system behavior or [the docs overview](docs/README.md) for the
repository documentation model. Use
[the docs index](docs/_index.md) to route to the smallest relevant document.
The [architecture overview](docs/architecture/README.md) describes the accepted
runtime direction, and [verification](docs/process/verification.md) and
[releases](docs/process/releases.md) own CI and release policy.

## Local Application

The explicit non-production composition can run with clean local D1 state:

```sh
pnpm --filter @booking-system/booking-system-web run e2e:prepare
pnpm --filter @booking-system/booking-system-web run dev:fixtures
```

The preparation command intentionally resets only the application's generated
local Wrangler state and applies all migrations. It does not provision or use
remote Cloudflare resources.

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
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm check
```

`pnpm check` composes lint, repository-tooling tests, booking-domain tests,
Worker/D1 and migration tests, the production build, and local Chromium
Playwright E2E. GitHub Actions runs that command in the `verify` job. Both real
workspaces have explicit deny-by-default boundary maps registered in ESLint.
