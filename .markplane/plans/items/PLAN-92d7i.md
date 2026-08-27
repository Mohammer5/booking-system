---
id: PLAN-92d7i
title: First Admin bootstrap and application foundation
status: draft
implements:
- TASK-aeij8
related: []
created: 2026-08-27
updated: 2026-08-27
---

# First Admin Bootstrap And Application Foundation Implementation Plan

## Objective And Scope

Implement `TASK-aeij8` as the first deployable booking-system slice: establish
first-ever Admin registration, normal Better Auth sessions, fresh Admin context
resolution, D1 persistence, the minimum same-origin browser/Worker flow, real
workspace boundaries, required tests, and the release surfaces triggered by
the first application.

The implementation ends with one Active Super Admin on a fresh installation
and a foundation that is locally verifiable and releasable. It does not build
later booking capabilities or use this plan as permission to start work.

## Canonical Ground Truth

- `TASK-aeij8` — objective, eight acceptance criteria, scope, and dependencies.
- `EPIC-m22qh` — first happy-path sequencing and deferred provider integration.
- `docs/product/admin-access.md#first-admin-bootstrap` — bootstrap behavior,
  Admin name validation, authority, and authoritative acceptance.
- `docs/product/domain-model.md#administration-and-invitations` — identity and
  Admin invariants.
- `docs/product/_status.md` — accepted product contract and absent product code.
- `docs/architecture/applications.md` — one same-origin application and initial
  Admin HTTP surface.
- `docs/architecture/packages.md` and
  `docs/architecture/module-organization.md` — booking ownership, source shape,
  interfaces, composition, and application responsibilities.
- `docs/architecture/boundaries.md` and `docs/architecture/eslint.md` — explicit
  deny-by-default workspace maps and sole ESLint enforcement.
- `docs/architecture/authentication-and-sessions.md` — Better Auth, opaque D1
  sessions, stable-principal seam, and non-production composition.
- `docs/architecture/persistence.md` — D1, permanent bootstrap history, atomic
  bootstrap claim, migration safety, and environment isolation.
- `docs/architecture/runtime-and-hosting.md` — Worker, Vite static assets,
  same-origin routing, and compatibility selection.
- `docs/process/verification.md` and `docs/process/releases.md` — canonical
  checks, layered evidence, tag gate, staging, production, and rollout safety.

If implementation reveals a conflict, canonical product behavior wins and the
plan must be amended before behavior is invented.

## Accepted Architecture Assumptions

- Create exactly the planned `packages/booking` conceptual workspace and
  `apps/booking-system-web` deployable workspace; neither exists today.
- Use modern ESM JavaScript, one manifest per workspace, one same-origin
  Cloudflare Worker application, Workers Static Assets, Vite, and D1.
- Better Auth is application-private and uses D1-backed opaque sessions.
- One principal may back an Admin User, Participant, both, or neither.
- `packages/booking` owns product contracts; the application owns HTTP,
  browser, Worker, authentication, D1 adapters, and executable composition.
- Production provider integration remains deferred. The first slice uses only
  deterministic, explicitly non-production fixture session establishment.
- Deny-by-default maps are created with real source and registered explicitly
  in root ESLint; no second architecture checker is permitted.

## Domain And Application Operation Contracts

### `getAdminAuthenticationEntry`

- Input: no identity or browser-controlled administration data.
- Result: `{ mode: "register-admin" }` when bootstrap has never completed;
  otherwise `{ mode: "login" }`.
- The decision reads durable bootstrap history, not current Admin User count.
- Reveal no counts, Admin identities, deletion history, or other Admin state.

### `bootstrapFirstAdmin`

- Conceptual inputs: authenticated `externalPrincipalId` plus supplied `name`.
- `externalPrincipalId` enters from application authentication context; the
  bootstrap request body contains only `name`.
- Trim for validation and refuse a blank result as `invalid-name`, following
  canonical Admin User name behavior.
- Success creates exactly one stable booking-domain Admin User ID linked to the
  principal, with the supplied booking name, Active state, and Super Admin
  authority.
- Normal outcomes are `created`, `invalid-name`, and
  `bootstrap-unavailable`; generic technical exceptions do not stand in for
  expected refusals.
- An earlier entry read reserves nothing. Mutation-time state decides races;
  only the first atomic claim succeeds.

### `resolveAdminContext`

- Input: authenticated `externalPrincipalId`.
- Read authoritative booking state on every relevant request.
- Results: `active-admin` with stable Admin User identity and current
  authority, `disabled-admin`, or `no-admin-user`.
- Never cache Admin state or authority into the Better Auth session.

## Authentication Principal Contract

```text
unauthenticated

authenticated {
  externalPrincipalId
}
```

No Better Auth record, provider type or identifier, OAuth detail, cookie,
provider profile property, Participant/Admin ID, selected role, `isAdmin`,
`isSuperAdmin`, permission, Course Assignment, or provider-derived authority
crosses into booking behavior.

```text
Better Auth session
  -> externalPrincipalId
  -> resolve context-specific booking identity
  -> evaluate current domain state and authority
```

## Persistence Capabilities And Invariant

Implement only equivalents of:

```text
hasAdminUserEverBeenCreated()
findAdminUserByExternalPrincipalId(externalPrincipalId)
claimFirstAdmin(candidateAdminUser) -> created | bootstrap-unavailable
```

The permanent historical fact is “first Admin bootstrap has successfully
occurred.” It survives deletion of every current Admin User and cannot be
derived from `COUNT(admin_users)`.

`claimFirstAdmin` must atomically combine:

```text
bootstrap has never completed
+ create first Active Super Admin
+ permanently consume bootstrap
```

Database constraints and the write operation must reject concurrent/stale
losers. No accepted state may contain a consumed bootstrap without its first
Admin creation, or two successful first Admins. The first Admin representation
needs conceptual `id`, `externalPrincipalId`, `name`, `state`, and `authority`
with uniqueness/integrity constraints implied by the product contract.

## Same-Origin HTTP Contract

| Operation | Authentication | Success | Expected refusals |
| --- | --- | --- | --- |
| `GET /api/admin/entry` | Public | `200` with `register-admin` or `login` mode only | Technical failure only |
| `POST /api/admin/bootstrap` | Normal application session | `201` with the created current Admin representation | `401 unauthenticated`; `409 bootstrap-unavailable`; `422 invalid-name` |
| `GET /api/admin/me` | Normal application session | `200` with the current Active Admin representation | `401 unauthenticated`; `403 no-admin-user`; `403 disabled-admin` |

- Failure bodies use the narrow machine-readable reasons above; the two `403`
  results remain distinguishable.
- Entry responses expose only `{ "mode": "register-admin" }` or
  `{ "mode": "login" }`.
- Bootstrap request JSON is `{ "name": "Jane Doe" }`. Do not accept
  trust-sensitive extensions: principal, Admin ID, state, authority, role, and
  permissions never originate in browser input.
- Admin success representations expose only the stable Admin ID, booking name,
  current state where needed, and current authority needed by this browser.
- Do not create a universal error, CRUD, controller, or API framework.

## Browser State Flow

```text
/admin -> load entry
  register-admin -> authenticate -> supply/confirm Admin name -> bootstrap
    created -> load administration context
    bootstrap-unavailable -> show bootstrap unavailable / proceed to login
  login -> authenticate -> resolve /api/admin/me
    active-admin -> administration context
    disabled-admin | no-admin-user -> explicit refused state
```

The browser must re-handle a lost bootstrap race. Choose only the components,
forms, and local state required by this flow; do not preselect a large frontend
architecture.

## Production And Non-Production Authentication

- Named fixture `first-admin` establishes a normal Better Auth session. The
  design leaves room for fixed `participant-a` and `participant-b` fixtures.
- No caller-supplied principal or `/login-as?principalId=...` capability exists.
- Fixture establishment supplies authentication only; booking authorization
  still comes from normal domain resolution.
- Production composition contains the normal application and Better Auth but
  no activatable fixture-session surface.
- Explicit non-production composition adds fixture-session establishment.
- Hosted staging/preview additionally requires a CI-controlled secret or an
  equivalent non-public gate.
- A production request for test authentication fails closed. Safety must come
  from executable/source composition, not only `ENABLE_TEST_AUTH`-style flags.

## Proposed Source Responsibilities

```text
packages/booking/src/
  admin-access/
  index.js

apps/booking-system-web/src/
  browser/
    admin-bootstrap/
  worker/
    admin-bootstrap/
  authentication/
  <thin browser and Worker entry/composition files>
```

Use product/use-case names below these roots. Do not introduce primary
`controllers`, `services`, `repositories`, `models`, `views`, `common`,
`core`, `utils`, `helpers`, or `infrastructure` organization.

## Intended Initial Boundary-Map Edges

`packages/booking` map:

- workspace dependencies: none;
- `admin-access -> []` for sibling responsibility modules and external
  application/runtime packages;
- package root public interface -> `admin-access` named re-exports only; and
- no application, HTTP, Worker/Cloudflare, D1, Better Auth, or UI imports.

`apps/booking-system-web` map:

- allowed workspace dependency: exact `packages/booking` package root chosen
  in its real manifest; package subpaths remain forbidden;
- `browser -> []` for first-level application modules and no direct workspace
  edge for this slice;
- `worker -> authentication` and `worker -> packages/booking` public root;
- `authentication -> []` for local responsibility modules and no booking
  workspace edge; Better Auth stays an application-private dependency;
- browser entry/composition -> `browser` only;
- production Worker entry/composition -> `worker + authentication` only;
- explicit non-production Worker composition -> `worker + authentication`,
  adding fixture-session establishment through the authentication-owned
  non-production interface; and
- no browser-to-Worker/auth/D1/Cloudflare edge, Worker-to-browser edge, or
  authentication-to-browser/booking-policy edge.

Actual composition filenames and the exact package specifier are selected with
the real manifests/source, but these node-to-node permissions are fixed. The
implementation must create both maps, explicitly register both in
`eslint.config.mjs`, and update `docs/architecture/boundaries.md` in the same
change. Tiny transport data stays application-owned; no shared/contracts
package is permitted for these endpoints.

## Logical D1 And Migration Scope

The first version-controlled migration sequence establishes only:

1. the then-current Better Auth technical user/account/session schema required
   by the selected D1 configuration;
2. booking-system Admin User persistence;
3. permanent first-bootstrap-consumed history;
4. uniqueness and integrity constraints preventing invalid first-Admin
   outcomes; and
5. a clean-state migration path exercised in tests.

Verify official Better Auth D1 schema/migration guidance at implementation
time; do not copy remembered generated schema. Use separate local/test,
staging, and production D1 databases. Keep migrations additive or otherwise
compatible with application versions during rollout.

## Verification Matrix

| Layer | Owned evidence |
| --- | --- |
| Pure booking/domain | Blank name refused; valid name forms a valid candidate; unavailable bootstrap creates nothing; success yields one Active Super Admin; public domain interface contains no Better Auth/provider concepts. |
| Worker/D1 integration | Clean migrations; first claim succeeds; second/stale/concurrent claim loses; deletion/current count cannot reopen bootstrap; principal resolves current Admin; Worker sources principal from auth context; unauthenticated and invalid bootstrap refusals; `/admin/me` distinguishes active, disabled, and missing from fresh state. |
| Browser E2E | Fresh entry shows Register admin; `first-admin` gains a normal Better Auth session; explicit name bootstrap succeeds; current identity is Active Super Admin and administration opens; a later authenticated principal cannot bootstrap. |
| Production-composition regression | A test-auth request against production composition cannot establish a session; evidence proves structural exclusion, not only a disabled flag. |
| Repository integration | Production build succeeds and root `pnpm check` composes lint, repository tests, domain tests, Worker/D1/migration integration, and local Chromium E2E without a competing check-all command. |

Routine tests never automate Google, Apple, Microsoft, or Facebook UIs.
Hosted E2E uses isolated staging data; production checks remain non-destructive.

## Release And Deployment Requirements

Because this is the first deployable application, the implementing change must
also provide real Cloudflare/Vite/Wrangler configuration, local/test plus
separate staging/production D1 configuration, and the tag-triggered GitHub
release workflow. Release must prove tag containment in `main`, rerun full
verification, deploy the same commit to staging, run hosted Playwright, apply
rollout-compatible production migrations, deploy production, and run only a
safe smoke check. Wrangler and all runtime/test integrations are project-pinned
and secrets remain environment-owned.

## Dependency-Ordered Implementation Phases

### Phase 1: Verify Toolchain And Establish Real Boundaries

- [ ] Verify current official Better Auth, Workers, Cloudflare Vite, D1,
  Cloudflare Vitest, and compatibility-flag guidance.
- [ ] Create both real workspaces, manifests, source roots, and explicit
  deny-by-default maps using the responsibility/edge contract above.
- [ ] Register both maps in root ESLint and update canonical boundary docs in
  the same change.

### Phase 2: Implement Domain And Persistence

- [ ] Implement the narrow `admin-access` operations/outcomes and pure tests.
- [ ] Add only the required Better Auth and Admin/bootstrap D1 migrations.
- [ ] Implement the atomic first-Admin claim and focused D1 integration tests.

### Phase 3: Compose Authentication And HTTP

- [ ] Integrate Better Auth and expose only the external-principal seam.
- [ ] Add structurally separate named-fixture non-production composition.
- [ ] Implement the three Worker operations and request/outcome translation.
- [ ] Prove browser input cannot control principal or authority.

### Phase 4: Deliver Browser And Regression Surfaces

- [ ] Implement the minimum `/admin` state flow without speculative frontend
  abstractions.
- [ ] Add Worker/D1/migration integration and local Chromium Playwright E2E.
- [ ] Add focused proof that production composition cannot activate test auth.
- [ ] Add real Cloudflare/Vite/Wrangler environment and build configuration.
- [ ] Expand the canonical `pnpm check` composition.

### Phase 5: Make The First App Releasable

- [ ] Add the real tag-gated release workflow, hosted staging verification,
  separate staging/production D1 resources, compatible migration rollout, and
  safe production smoke check.
- [ ] Run complete verification, review docs/maps/configuration together, and
  only then mark `TASK-aeij8` done.

## Acceptance-Criteria Traceability

| Task criterion | Implementation and evidence |
| --- | --- |
| Register admin before any Admin ever exists | Entry operation, durable history, `/api/admin/entry`, domain + D1 + E2E evidence. |
| Valid registrant becomes exactly one Active Super Admin | Name contract, atomic claim, `201`, pure + D1 + E2E evidence. |
| Session has no booking role/authorization | External-principal seam, fresh `/api/admin/me`, domain-interface and integration tests. |
| Abandoned bootstrap creates nothing; only first completion wins | Mutation-only creation, atomic claim, stale/concurrent D1 tests. |
| Bootstrap never reopens; auth creates no later Admin | Permanent history, second/later-principal refusals in D1 and E2E. |
| Named non-production sessions exercise real authorization | Separate fixture composition and normal-session browser path. |
| Production test auth fails closed; hosted access gated | Structural regression plus staging CI secret/equivalent gate. |
| First deployable foundation satisfies every trigger | Workspace maps, migrations, expanded `pnpm check`, runtime config, release workflow, staging and smoke evidence. |

## Explicit Non-Goals

- No Admin Invites, later Admin onboarding, promotion UI, or production social
  providers.
- No Course, Group, Module, Participant, Course Assignment, Module Selection,
  or Invite endpoints/schema.
- No separate API app; no frontend/backend/shared/contracts/core/utils/
  infrastructure package.
- No generic repository, service, unit of work, CRUD, API, or error framework.
- No password authentication, arbitrary-principal impersonation, provider UI
  automation, implicit provider linking, or booking authority in sessions.
- No abstractions, dependencies, configurations, or source trees solely for
  speculative future reuse.

## Intentionally Deferred Implementation Choices

- Exact D1 table/column names, low-level SQL/query organization, and exact
  Better Auth-generated schema details.
- Exact Better Auth, Cloudflare, Vite, Vitest, Playwright, and Wrangler versions.
- Narrowest then-supported Worker compatibility flag.
- Session lifetime/refresh values and production provider configuration.
- Frontend framework unless concrete implementation need requires one.
- Exact package specifier, internal helper/composition filenames, component
  decomposition, and request/response helper placement.
- Generic future HTTP conventions and all Course/Participant/Invite routes.

Implementation must update this plan before freezing any deferred choice that
materially changes a canonical contract.
