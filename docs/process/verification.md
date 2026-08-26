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

When real application or domain behavior exists:

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

Confirm the package name and compatibility against current official
Cloudflare guidance when dependencies are actually added.

### Browser Tests

Playwright is the initial browser E2E tool. Routine CI starts with Chromium
only; more browsers or devices require a demonstrated compatibility need.

Normal pull-request CI will run Playwright against a local production-like
application composed from Vite/static assets, the Worker API, and an isolated
local D1 database. Tests must start from deterministic state rather than a
developer's database. Representative flows should eventually cover:

- an Admin creating and configuring a Course;
- a Participant joining and accessing a Course;
- a Participant selecting a Module and Group, changing Group, and revoking
  future participation;
- invite-link and Course Assignment revocation behavior; and
- important authorization failures.

Detailed product invariants remain lower-level-test responsibilities.

Routine E2E must not automate Google, Apple, Microsoft, or Facebook login UIs.
When authentication is implemented, tests need an explicitly non-production
way to establish identities such as Admin, Participant A, and Participant B.
That mechanism must not create a hidden production bypass, and production must
fail closed if test-only authentication is requested. Focused boundary tests
own third-party OAuth/OIDC integration.

On browser-test failure, CI should retain short-lived useful diagnostics such
as the Playwright report, traces, screenshots, and relevant logs. Artifacts
must exclude secrets, tokens, and sensitive production data and should not be
uploaded without failure or debugging value.

### Hosted And Production Checks

The release gate runs Playwright against a real Cloudflare staging or preview
deployment. After production deployment, verification is limited to safe,
non-destructive smoke checks such as serving the application entrypoint or a
harmless readiness/read operation. Regression tests never create synthetic
Courses, Participants, or bookings in production.

## Canonical Repository Command

`pnpm check` is the one comprehensive non-deployment verification entrypoint.
Today it composes lint with the repository's Node-based ESLint tooling tests.
The current scripts are:

```sh
pnpm lint
pnpm test
pnpm check
```

When application code exists, expand `pnpm check` rather than introducing a
competing check-everything command. It should eventually compose lint,
repository tooling tests, unit tests, Worker/API/D1 and migration tests, a
production build, and local browser E2E. Release CI must reuse the same
underlying surfaces rather than maintain a hidden alternative suite.

## Pull-Request CI Gate

The repository's GitHub Actions CI workflow currently:

- runs for pull requests targeting `main` and pushes to `main`;
- reads Node and pnpm versions from repository declarations;
- installs from `pnpm-lock.yaml` with `--frozen-lockfile`;
- runs `pnpm check` in the uniquely named `verify` job;
- uses read-only repository permissions and no Cloudflare credentials; and
- cancels superseded verification for the same pull request or branch.

Cloudflare preview deployment is not required for each pull request. Local
Worker, D1, and browser verification is the initial PR contract once those
surfaces exist.

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
