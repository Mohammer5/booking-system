# Booking System

This repository contains the product specification and the first locally
complete application foundation for a deliberately simple course and module
booking system. It currently includes:

- an authoritative, implementation-agnostic product specification;
- an indexed, maintainable documentation process;
- a conceptual-domain-first architecture philosophy with ESLint enforcement;
- a locally runnable React/Vite and Cloudflare Worker application with D1;
- real Google authentication with Admin and Participant sign-in/sign-out, the
  first-Admin bootstrap, and explicit Participant registration with a
  zero-membership home;
- GitHub Actions verification for pull requests and `main`; and
- a repository-local Markplane development backlog.

The local application implements the normal Google provider flow. Remote
production provider credentials and callback/domain configuration, the other
accepted providers, remote Cloudflare resources, a release workflow, and a
production deployment remain deferred; local acceptance is not release
approval.

Start with [the product specification](docs/product/README.md) for accepted
booking-system behavior or [the docs overview](docs/README.md) for the
repository documentation model. Use
[the docs index](docs/_index.md) to route to the smallest relevant document.
The [architecture overview](docs/architecture/README.md) describes the accepted
runtime direction, and [verification](docs/process/verification.md) and
[releases](docs/process/releases.md) own CI and release policy.

## NixOS Development

On x86_64 NixOS with flakes enabled, enter the repository development
environment before installing dependencies:

```sh
nix develop
pnpm install --frozen-lockfile
```

The flake supplies Node 24, the repository-declared pnpm 11.17.0, Git,
Markplane, Chromium, and a Nix-compatible build of the lockfile-resolved
workerd. JavaScript application and Cloudflare tooling such as Wrangler, Vite,
and Vitest remain project-pinned in `package.json` and `pnpm-lock.yaml`.

Entering the shell does not install dependencies, change local D1 state,
create `.env`, or start a server. Use the existing commands below after entry;
normal development still reads the ignored application `.env`, while
`pnpm check` remains the comprehensive credential-independent verification
command. GitHub Actions continues to provision its tools directly, and this
repository has no Docker-based development path.

## Real Local Google Authentication

Create the ignored application environment file from the committed example:

```sh
cp apps/booking-system-web/.env.example apps/booking-system-web/.env
```

Keep its values local and supply a high-entropy `BETTER_AUTH_SECRET` of at
least 32 characters together with the Google Client ID and Client Secret. The
normal local application uses exactly `http://localhost:5173`; startup fails
if that port is occupied so the registered OAuth origin cannot drift.

To prepare a clean local D1 database and start the normal application:

```sh
pnpm --filter @booking-system/booking-system-web run dev:prepare
pnpm --filter @booking-system/booking-system-web run dev
```

Google must have `http://localhost:5173` as an authorized JavaScript origin and
`http://localhost:5173/api/auth/callback/google` as its one local redirect URI.
The preparation command intentionally resets only the application's generated
development Wrangler state and applies all migrations; it provisions no remote
Cloudflare resource. Fixture and Playwright runs use a separate generated
`.wrangler/e2e-state` root, so automated verification cannot reset or replace a
running manual development database.

For the Admin smoke journey, open `http://localhost:5173/admin`, continue with
Google, supply the required booking-system Admin name when the fresh database
offers bootstrap, verify the Active Super Admin, and sign out. For the
Participant journey, open `http://localhost:5173/`, continue with Google,
explicitly supply the booking-system name and email, and verify the Active
profile, truthful zero-Course state, absence of public Course discovery, and
refresh-safe return. While signed in as the same Google principal, navigating
between `/` and `/admin` must reach the two independent domain identities
rather than selecting or storing a role. Sign out when finished.

Automated verification covers provider wiring, fixed destinations, the one
callback, sanitized failures, normal fixed fixture sessions, the Participant
onboarding/application journey, and structural production exclusion of fixture
authentication. It does not automate Google's hosted UI.

## Deterministic Fixture Authentication

Routine browser tests and explicit fixture-based local work use the separate
non-production composition:

```sh
pnpm --filter @booking-system/booking-system-web run e2e:prepare
pnpm --filter @booking-system/booking-system-web run dev:fixtures
```

Its committed authentication values are visibly non-secret test-only values.
It establishes only fixed normal Better Auth sessions and is structurally
absent from production composition. Build and automated-test commands disable
local `.env` loading; only the normal `dev` command consumes the real local
provider and Better Auth secrets. `e2e:prepare` resets only the generated
fixture/Playwright state and leaves normal development state untouched.

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
