# Verification

## Responsibility

This document owns the layered regression strategy, the canonical repository
verification command, pull-request [CI gate](../DICTIONARY.md#ci-gate), and the
evidence required before a change can be merged or released.

## Not Responsible For

This document does not own product behavior, application runtime composition,
production promotion order, or remote GitHub ruleset administration.

## Inputs

- repository and application changes;
- deterministic test data and isolated test environments; and
- the repository-declared Node and pnpm versions and lockfile.

## Outputs

- one canonical non-deployment verification result;
- the stable GitHub status check named `verify`; and
- layer-specific diagnostics when verification fails.

## Adjacent Parts

[Releases](releases.md) composes these checks with staging and production
promotion. [Runtime and hosting](../architecture/runtime-and-hosting.md) and
[persistence](../architecture/persistence.md) define the environments being
exercised.

## Layered Regression Harness

Each layer owns different evidence. Higher-level tests do not replace focused
lower-level tests, and the same assertion should not be copied into every
layer.

```text
repository/architecture tooling tests
        |
        v
pure unit/domain tests
        |
        v
Worker/API/D1 integration tests
        |
        v
local full-browser E2E tests
        |
        v
Cloudflare staging/preview E2E tests
        |
        v
small non-destructive production smoke tests
```

### Repository Tooling Tests

The current Node test suites own the repository's ESLint rules and boundary
converter behavior. They remain Node tests rather than being migrated to
Vitest for uniformity.

### Product And Worker Tests

For real application and domain behavior:

- Vitest owns fast product, transformation, validation, and frontend-logic
  tests that do not need a browser;
- Cloudflare's then-current official Workers Vitest integration owns tests that
  require the Workers runtime or bindings such as D1;
- the currently accepted integration package is
  `@cloudflare/vitest-plugin`, not the obsolete
  `@cloudflare/vitest-pool-workers` name;
- Worker integration tests exercise request handling, authorization,
  validation, bindings, serialization, errors, D1 queries and constraints, and
  migration behavior as applicable; and
- database tests construct deterministic isolated state from the
  version-controlled migration sequence, never from production D1.

For the first Admin foundation, focused domain tests own name validation and
bootstrap outcomes, while Worker/D1 integration tests own permanent bootstrap
history, atomic first-Admin concurrency, external-principal resolution, and
fresh current-Admin authorization. Browser tests own the composed registration
journey and a later principal's bootstrap refusal. The task implementation plan
assigns the detailed assertions without duplicating every invariant at every
layer.

For Course create/view, booking-domain Vitest owns minimal fields, timezone
validation/defaulting, nonunique names, Active outcome, and no-effect refusals.
Worker/D1 Vitest owns clean and upgrade migrations, stable persistence,
guarded stale-Admin acceptance, concurrent independent creation, exact HTTP
outcomes, and production composition. Playwright owns the German empty/create/
detail/refresh journey, validation and refusal focus, responsive layout,
pre-authorization privacy, and accessible route states.

For Group and future-Module creation, booking-domain Vitest owns Group
normalization, minimal structure outcomes, strict Course-local minute
resolution, DST gaps/overlaps, definite interval rules, injected-time
boundaries, and validation before persistence. Worker/D1 Vitest owns the
additive migration, permanent Course ownership, normalized-name concurrency,
guarded current-state writes, atomic first-Module scheduling history, exact
nested HTTP contracts, and no partial side effects. Playwright owns the German
Course-detail empty/create/list/refresh journeys, duplicate and time errors,
explicit overlap selection, exact-instant presentation, stale/technical
refusal focus, responsive layout, and axe scans.

For Participant registration, booking-domain Vitest owns required name,
complete trimmed-email validation, case-insensitive comparison, and the absence
of provider alias normalization. Worker/D1 Vitest owns the additive migration,
principal/email uniqueness and concurrency, fresh Participant resolution,
narrow HTTP outcomes, separate Admin/Participant identities, no partial
profile, and structural production fixture exclusion. Playwright owns the
German Google entry, explicit onboarding, validation/conflict, Active
zero-membership home, direct refresh, same-principal context switching,
sign-out, privacy, desktop/360px, keyboard/focus, and axe evidence.

For direct Course Assignment, booking-domain Vitest owns Active/Disabled target
eligibility, Active-assignment idempotence, current actor/Course refusal, and
membership-only outcomes. Worker/D1 Vitest owns the additive migration,
restrictive ownership, one-pair uniqueness and concurrency, ordered Participant
and membership reads, guarded current-state acceptance, narrow HTTP/privacy
contracts, and absence of partial identity or Module Selection effects.
Playwright owns zero-Assignment discovery, Course membership empty/list/assign
and repeat journeys, Disabled-target presentation, stale/technical refusal,
direct refresh, Admin-gate privacy, desktop/360px, Dialog keyboard/focus, and
axe evidence.

The implemented integration uses project-pinned `@cloudflare/vitest-plugin`
with isolated D1 state and the version-controlled migration sequence.

### Browser Tests

Playwright is the initial browser E2E tool. Routine CI starts with Chromium
only; more browsers or devices require a demonstrated compatibility need.
On x86_64 NixOS, the development flake supplies Chromium and uses the existing
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` configuration seam; this local provision
does not change the Playwright project or CI browser installation.

Normal pull-request CI runs Playwright against a local production-like
application composed from Vite/static assets, the Worker API, and an isolated
local D1 database. Tests must start from deterministic state rather than a
developer's database. The fixture/Playwright server and migration preparation
use a dedicated generated Wrangler persistence root; resetting it must leave
normal manual-development state untouched. Representative flows should
eventually cover:

- an Admin User creating and configuring a Course;
- a Participant joining and accessing a Course;
- a Participant selecting a Module and Group, changing Group, and revoking
  future participation;
- invite-link and Course Assignment revocation behavior; and
- important authorization failures.

Detailed product invariants remain lower-level-test responsibilities.

Routine E2E must not automate Google, Apple, Microsoft, or Facebook login UIs.
The implemented direction is an explicitly non-production Better Auth
test-capable composition that establishes normal application sessions for the
fixed `first-admin`, `later-admin`, `participant-a`, and `participant-b`
identities.
Playwright then exercises the normal authenticated application and real
booking-domain authorization; test authentication must not mock or bypass it or
permit arbitrary-principal impersonation.

Production composition must contain no activatable test-authentication route
or bypass and must fail closed regardless of headers, queries, or cookies when
test-only authentication is requested. A focused automated regression must
prove this structural property. Hosted staging or preview test-authentication
requires a CI-controlled secret or equivalently strong non-public gate. The
implemented Google provider has focused Worker-boundary evidence for
environment wiring, the one callback, and external application-destination
rejection without contacting Google's hosted UI. See [authentication and
sessions](../architecture/authentication-and-sessions.md#non-production-authentication).

The Admin browser flow uses fixed named fixture identities to prove the state
after authentication: the first name form is absent before authentication,
bootstrap still creates one Active Super Admin, later normal login resolves
authoritative Admin state, and Better Auth sign-out terminates the session and
returns to the unauthenticated entry. CI supplies only visibly fake test
provider configuration and never requires real Google credentials. The build,
Worker-test, and Playwright-server commands disable local `.env` loading so a
developer's provider secrets cannot become automated-test inputs or generated
preview artifacts.

The Participant browser flow proves authentication alone creates no booking
identity, mandatory profile input creates one Active Participant, duplicate
email and stale outcomes have no partial effect, the zero-Assignment home
issues no Course request, and the same normal session resolves distinct
Participant/Admin identities. Real Google provider interaction for both
contexts remains a documented manual smoke in [authentication and
sessions](../architecture/authentication-and-sessions.md#manual-local-google-smoke).

The browser harness declares `@axe-core/playwright` and scans each critical
Admin state plus both application contexts at normal desktop and 360px-wide
viewports. Axe supplements rather than replaces assertions for
landmarks/headings, named list navigation, control names, keyboard-only
activation, visible focus, field/error association, Drawer/Dialog trapping and
restoration, result/error focus, direct navigation and refresh, Participant
onboarding/zero-membership/privacy states, Participant directory and Course
membership/direct-Assignment states, and absence of horizontal overflow. The
current twenty-one-test browser suite also proves that one fixed normal session
remains usable while navigating between Participant and Admin contexts,
successful sign-out terminates that session, and an Active Admin can create
and revisit a Course with Groups, a future Module, and direct Participant
membership while missing Admin context causes no private Course-access request.

On browser-test failure, CI should retain short-lived useful diagnostics such
as the Playwright report, traces, screenshots, and relevant logs. Artifacts
must exclude secrets, tokens, and sensitive production data and should not be
uploaded without failure or debugging value.

### Hosted And Production Checks

The release gate runs Playwright against a real Cloudflare staging or preview
deployment. After production deployment, verification is limited to safe,
non-destructive smoke checks such as serving the application entrypoint or a
harmless readiness/read operation. Regression tests never create synthetic
Courses, Participants, bookings, authentication identities, or sessions in
production.

## Canonical Repository Command

`pnpm check` is the one comprehensive non-deployment verification entrypoint.
The current scripts include:

```sh
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm check
```

`pnpm test` composes the repository's Node tooling tests, booking-domain Vitest,
and Worker/D1 Vitest. `pnpm check` adds lint, the production Vite/Worker build,
and local Chromium Playwright E2E. Release CI must reuse the same underlying
surfaces rather than maintain a hidden alternative suite.

NixOS developers may run these commands inside `nix develop`, which supplies
host tools but does not install the pnpm dependency graph or run verification
automatically. `nix flake check` validates the normal flake outputs only; it is
not a second comprehensive repository command.

## Pull-Request CI Gate

The repository's GitHub Actions CI workflow currently:

- runs for pull requests targeting `main` and pushes to `main`;
- reads Node and pnpm versions from repository declarations;
- installs from `pnpm-lock.yaml` with `--frozen-lockfile`;
- installs the project-pinned Playwright Chromium and its runner dependencies;
- runs `pnpm check` in the uniquely named `verify` job;
- remains independent of the local Nix development environment;
- uses read-only repository permissions and no Cloudflare credentials; and
- cancels superseded verification for the same pull request or branch.

Cloudflare preview deployment is not required for each pull request. Local
Worker, D1, and browser verification is the current PR contract.

## External Main-Branch Protection

Repository files define but cannot activate GitHub branch protection. The
remote `main` ruleset must:

- require pull requests and a successful `verify` status before merge;
- prevent silent bypass of that required check; and
- prevent force-pushes and deletion unless a conscious governance decision
  explicitly permits them.

The workflow's presence does not prove these remote settings are active.

## Application Implementation Trigger

The change that introduces the first deployable application is incomplete
unless it, or a directly associated change, also adds real tests and
configuration for the behavior introduced: Vitest, the current Cloudflare
Workers Vitest integration, Playwright, the local application E2E harness,
migration tests, and expanded root verification composition as applicable.
Empty test configurations are not an acceptable substitute, and product
runtime code must not accumulate while these applicable regression surfaces
are postponed indefinitely.
