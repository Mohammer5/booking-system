---
id: PLAN-n8a29
title: Implement Participant registration
status: draft
implements:
- TASK-7uxjj
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Implement Participant Registration

## Overview

Implement `TASK-7uxjj` as the first complete `course-access` vertical slice:
pure Participant context/onboarding policy, one additive D1 migration, narrow
Participant HTTP operations, fixed normal Google entry, deterministic fixture
identities, and a German MUI onboarding/home/sign-out flow at `/`.

Registration creates one Active Participant only after valid explicit name and
email input. Principal and complete trimmed case-insensitive email uniqueness
are decided atomically at D1. Authentication, abandoned forms, validation
failures, stale/concurrent losers, and duplicate email create no Participant,
Assignment, Selection, or pending record.

## Ground Truth

- `TASK-7uxjj`, `EPIC-m22qh`, and `NOTE-7gbq2` — acceptance, deterministic
  order, local-only scope, UI/accessibility, and evidence ownership.
- `docs/product/domain-model.md:38-91`, `:228-251`, and `:350-401` — distinct
  external principal/Participant identity, required profile, lifecycle,
  uniqueness, naming, and valid zero-membership state.
- `docs/product/course-access.md:44-156`, `:379-435` — registration without an
  Invite, onboarding gate, profile normalization, privacy/no discovery, and
  authoritative-current-state rules.
- `docs/product/_decisions.md:17-41`, `representative-scenarios.md:7-36`, and
  `non-goals.md:7-40` — explicit profile data, separate identities, scenarios
  A/B/D, and excluded merging/pending/password behavior.
- `docs/architecture/authentication-and-sessions.md:42-256`, `:291-342` — one
  principal-only session, contextual resolution, onboarding composition,
  Google/linking policy, and fixed non-production identity rules.
- `packages/booking/src/admin-access/createResolveAdminContext.js:1-28`,
  `createBootstrapFirstAdmin.js:1-52`, and `adminAccess.test.js:1-112` — narrow
  operation factories, language-neutral outcomes, validation-before-effect,
  and public-interface test conventions.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql:1-69`,
  `src/worker/admin-bootstrap/createAdminPersistence.js:1-89`, and its Worker
  tests — current uniqueness, row mapping, atomic classification, and D1
  clean-state patterns.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminHttpHandler.js:1-155`,
  `createWorkerApplication.js:1-78`, and both Worker compositions — exact
  routing, session-derived principal, narrow response, UUID, and persistence
  injection seams.
- `apps/booking-system-web/src/authentication/fixture-session/
  createFixtureSessionEstablishment.js:1-100` and
  `createAuthentication.worker.test.js:1-100` — fixed identities, normal
  signed sessions, single Google callback, and destination structural tests.
- `apps/booking-system-web/src/browser/participant-entry/
  ParticipantEntryPage.jsx:1-50`, `admin-bootstrap/useAdminBootstrap.js:1-113`,
  and sibling form/auth components — current `/` shell plus MUI, query,
  mutation, authentication, form, focus, and i18n patterns.
- `apps/booking-system-web/test/e2e/applicationShell.spec.js:1-215` and
  `adminBootstrap.spec.js:1-420` — desktop/360px, real fixture session,
  same-session navigation, keyboard/focus, privacy, refresh, sign-out, and axe
  conventions.
- `docs/architecture/{applications,persistence,packages,module-organization,
  browser-conventions,boundaries}.md` and
  `docs/process/{conceptual-simplicity,verification}.md` — ownership,
  boundary, migration, browser, and layered-verification constraints.

## Approach

- Add dependency-free `packages/booking/src/course-access/` operations:
  - `createResolveParticipantContext`, resolving missing, Disabled, or Active
    Participant fresh by external principal; and
  - `createRegisterParticipant`, validating a nonblank name, trimming and
    validating the complete email string, deriving only a case-insensitive
    comparison key, creating a stable Active candidate, and translating
    persistence outcomes without partial changes.
- Preserve a valid supplied name as booking profile data, matching current
  required-text policy; retain email after surrounding whitespace is removed.
  Use no provider-specific local-part, alias, dot, or mailbox transformation.
- Add `0004_participants.sql` with stable identity, unique external principal,
  required name, retained trimmed email, unique normalized complete email, and
  constrained Active/Disabled state. One guarded insert is the atomic
  registration outcome; constraints decide repeated/concurrent losers.
- Add a Worker `course-access` slice with narrow persistence and HTTP:

  | Operation | Success | Refusal/error |
  | --- | --- | --- |
  | `GET /api/participant/me` | `200` current Active Participant | `401`; `403 no-participant`; `403 disabled-participant` |
  | `POST /api/participant/onboarding` | `201` created Active Participant | `401`; `422 invalid-name`/`invalid-email`; `409 participant-already-exists`/`email-already-exists` |

- Derive principal, Participant ID, lifecycle state, and normalized email only
  server-side. Browser trust fields are ignored. Responses expose only `id`,
  `name`, `email`, and `state`; no provider/session or other Participant data.
- Add fixed `participant-a` and `participant-b` fixture-session paths. Keep
  production structurally unable to import/activate fixture establishment and
  keep every fixture route incapable of caller-selected principal input.
- Add a participant-owned Better Auth client with fixed `/` success and fixed
  sanitized same-origin error destination. Extend the Worker sanitizer with a
  fixed Participant redirect while retaining the one Google callback/session.
- Replace the request-free `/` placeholder with query-driven states:
  unauthenticated Google entry; authenticated missing-Participant name/email
  onboarding; Active Participant home with truthful zero-Course state and
  sign-out; Disabled refusal for forward compatibility; loading/technical,
  validation, conflict, pending, success, and authentication-error states.
- Keep TanStack Query, React Hook Form, direct MUI Core, and participant-owned
  German i18n in the existing slice. Move focus to invalid fields, mutation
  refusal/success, and post-sign-out entry; retain responsive/axe/keyboard
  behavior and expose no Course query or public discovery.

## Acceptance Mapping

| Criterion | Planned evidence |
| --- | --- |
| Fresh contextual resolution / no role | Domain context tests, Worker session tests, same-principal browser journey. |
| Explicit valid profile / nonauthoritative provider data | Domain validation, narrow HTTP body, MUI form and autocomplete assertions. |
| Trimmed complete email uniqueness / no alias normalization | Domain tables plus D1 duplicate/concurrency cases. |
| Exactly one Active Participant / zero membership | D1 row and schema/count evidence plus zero-Course home. |
| Abandonment and authentication alone create nothing | Worker counts and browser sign-in/onboarding refresh evidence. |
| Repeated/stale/concurrent refusal / no partial profile | Constraint-backed Worker tests and browser conflict focus. |
| Fixed normal Google and safe fixtures | Auth request-shape tests, fixed routes, production exclusion. |
| Refresh/home/sign-out/privacy/accessibility | Real Playwright journey at desktop/360px with axe and keyboard/focus. |

## Non-Goals / Out of Scope

- No Participant profile editing (`TASK-ca46j`), Disable/Re-enable
  (`TASK-25j4s`), or Admin-side Participant management (`TASK-z6hut`).
- No Course Assignment, Invite continuation/Join (`TASK-5gny6`), Course
  access (`TASK-qk47b`), or Module Selection (`TASK-jvqrk`) schema or behavior.
- No provider-derived authoritative profile, email verification/delivery,
  pending identity, password, provider linking, merge/transfer/recovery, other
  providers, remote credentials/D1, deployment, or release hardening.
- No generic identity/repository/API/form/authentication abstraction and no
  application first-level module or third-party dependency change.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| Introduce the accepted `course-access` responsibility now | Canonical package ownership names Participant identity/onboarding here; this is its first implemented behavior. |
| Store retained email plus normalized comparison key | Preserves explicit profile spelling while D1 enforces full-address case-insensitive uniqueness atomically. |
| Single-row insert with unique constraints | Registration creates one entity only; no transaction framework or pending state is needed. |
| Separate Participant HTTP slice and browser client | Product ownership stays visible while both reuse the one application session through composition/HTTP. |
| Two fixed Participant fixtures plus existing first Admin | Covers independent principals and same-principal dual contexts without arbitrary impersonation. |
| Keep `/` as onboarding and home | It is already the stable Participant entry and no additional independently navigable view is required. |

## Phases

### Phase 1: Domain Responsibility

- [ ] Implement/test Participant context, onboarding validation, complete-email
      normalization, language-neutral outcomes, and validation-before-effect.
- [ ] Register `course-access` in package exports/boundary map and update the
      canonical boundary documentation in the same change.

**Checkpoint**: booking Vitest proves validation, alias non-normalization,
uniqueness outcome translation, distinct identities, and no invalid effect.

### Phase 2: Migration, Persistence, Worker, And Authentication

- [ ] Add migration 0004 plus clean/upgrade/constraint evidence.
- [ ] Implement/test Participant persistence and exact HTTP contracts,
      atomic/repeated/concurrent outcomes, fresh state, ignored trust fields,
      dual Admin/Participant identity, and zero partial records.
- [ ] Add fixed Participant fixtures and fixed Google/error destinations with
      structural production-exclusion evidence.

**Checkpoint**: isolated D1/Worker tests prove one valid registration per
principal/email and no domain identity from authentication alone.

### Phase 3: Participant Browser Journey

- [ ] Implement the German MUI entry/onboarding/home/refusal/sign-out flow with
      query/form ownership, complete states, predictable focus, and privacy.
- [ ] Replace outdated request-free shell evidence with real Participant
      session/onboarding/refresh/zero-membership/dual-context E2E plus
      duplicate/stale/technical state tests at desktop and 360px.

**Checkpoint**: the complete Participant flow passes keyboard, focus, field
association, direct refresh, no-Course-request, overflow, and axe assertions.

### Phase 4: Documentation And Completion

- [ ] Update canonical product/architecture/process status, application/API,
      persistence, auth/manual-Google-smoke, package/module/browser/boundary,
      verification, index, and dictionary implementation wording; update no
      nonexistent co-located docs.
- [ ] Run focused checks and canonical `nix develop -c corepack pnpm check`,
      close task/plan/epic state where warranted, validate Markplane/diff, and
      commit one semantic implementation change ending in `TASK-7uxjj`.

**Checkpoint**: schema, code, docs, tracking, tests, and Git agree Participant
registration is locally complete while later membership/release work is absent.

## Testing Strategy

- Booking Vitest: blank name; malformed/partial email; trimming/retention;
  case-insensitive complete address; distinct `+tag` and dotted addresses;
  candidate shape; missing/Disabled/Active context; refusal/no capability call.
- Worker/D1: clean/0001-0003 upgrade; schema checks; one row per principal and
  normalized email; repeat/stale/concurrent attempts; duplicate email from
  distinct principals; fresh Disabled state; dual Admin/Participant rows;
  exact auth/status/body/trust-field contracts; absence of assignment/selection
  effects; production fixture exclusion and Google destination shape.
- Playwright: unauthenticated entry; Google initiation failure; fixture
  onboarding; client/server validation; duplicate refusal; success focus;
  zero membership; refresh/return; first-Admin dual context; sign-out;
  no Course/private requests; desktop/360px; keyboard; labels/autocomplete;
  error association; axe; no horizontal overflow.
- Regression: lint/boundary tests, domain/Worker suites, production graph/build,
  full `pnpm check`, then `markplane sync`, `markplane check`, and
  `git diff --check`.

## Rollback Plan

Before deployment, revert the domain/Worker/browser/docs slice and migration
0004 together; local/test D1 is disposable. After deployment, retain the
additive Participant table and roll application behavior back rather than
using a destructive down migration. No remote database exists in this task.

## Execution State

- Current phase/checkpoint: fresh code-grounded plan created; implementation
  has not begun.
- Completed phase checkboxes: none.
- Next exact action: validate and commit this planning checkpoint, then begin
  Phase 1 domain tests and operations.
- Persisted decisions: canonical product/authentication behavior remains in
  the cited docs; implementation/API/schema/UI decisions are recorded above.
- Focused verification: rehydration, dependency readiness, current source/test/
  migration/config inspection, and adjacent-doc check complete; no applicable
  adjacent `*.docs.md` exists.
- Remaining verification: all focused layers, canonical `pnpm check`,
  Markplane checks, task acceptance closure, and clean-tree verification.
- Working tree: only `TASK-7uxjj` start/plan tracking changes; no unrelated
  changes are present.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under the repository's 300-line split threshold

## References

- `TASK-7uxjj`, `EPIC-m22qh`, and `NOTE-7gbq2`
- `TASK-aeij8` / `PLAN-92d7i`
- `TASK-dfq2k` / `PLAN-vx3ws`
- `TASK-z6hut`, `TASK-5gny6`, and `TASK-rrp92`
