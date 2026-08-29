---
id: PLAN-zk9un
title: Implementation plan for List and edit Admin Users
status: done
implements:
- TASK-45jmb
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Admin User Directory And Name Editing Implementation Plan

## Overview

Add the first current-Admin-User management slice without implementing the
promotion or lifecycle actions owned by later tickets. Every Active Admin can
read the complete current directory. Name editing uses explicit domain policy
for self, ordinary-Admin, and Super-Admin target boundaries, then repeats the
authorization inside one guarded D1 name-only update so a stale actor,
promotion, or deletion cannot partially mutate the target.

The existing `admin-access` package responsibility owns list/edit policy. The
existing application-private Admin browser and Worker slices own German MUI,
same-origin HTTP, authentication, and D1 mechanics. The existing
`admin_users` schema already contains every required field and constraint, so
this ticket needs no migration, dependency, boundary-map, or new fixture
identity.

## Ground Truth

- `.markplane/backlog/items/TASK-45jmb.md` — complete current directory,
  exact actor/target matrix, name-only preservation, stale acceptance, UI,
  and evidence requirements.
- `docs/product/admin-access.md#name-and-onboarding` — required nonblank
  booking-system name and provider-data independence.
- `docs/product/admin-access.md#ordinary-admin-user-authority` and
  `#super-admin-administration-and-self-protection` — self, ordinary, and
  Super-Admin edit authority.
- `docs/product/admin-access.md#admin-user-view` and
  `#authoritative-current-state` — complete current representation, permitted
  actions only, and fresh acceptance-time authorization.
- `docs/product/domain-model.md#admin-user` — stable identity, state, authority,
  and independence from Participant.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql` — existing
  required-name constraint, unique external principal, Active/Disabled state,
  and ordinary/Super authority.
- `packages/booking/src/admin-access/createListAdminInvites.js` and
  `createRevokeAdminInvite.js` — current Active-actor operation and guarded
  persistence-outcome conventions.
- `packages/booking/src/course-access/createUpdateParticipantProfileAsAdmin.js`
  — validation-before-effect and identity-preserving update result shape.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminPersistence.js`
  — current Admin row mapping and the natural persistence owner.
- `apps/booking-system-web/src/worker/course-access/createCourseAccessHttpHandler.js`
  — collection/detail/edit routing, fresh Admin authorization, narrow
  representations, and sanitized error translation.
- `apps/booking-system-web/src/browser/course-access/ParticipantDirectoryPage.jsx`,
  `AdminParticipantDetailPage.jsx`, and `ParticipantProfileForm.jsx` — direct
  directory/detail routes, German states, form validation, and focus patterns.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdministrationContext.jsx`
  and `useAdminBootstrap.js` — current Admin outlet/navigation and current-
  context query ownership.
- `apps/booking-system-web/src/authentication/fixture-session/createFixtureSessionEstablishment.js`
  — existing fixed Super and invited ordinary principals; fixtures establish
  normal sessions only and do not create booking identities.
- `docs/process/verification.md` — layered domain, Worker/D1, responsive,
  keyboard/focus, privacy, and axe evidence.

The co-located docs check found no adjacent `*.docs.md` for the inspected
Admin domain, Worker, browser, composition, fixture, or migration source.

## Approach

1. Add focused Admin User policy operations:
   - list only for an Active actor and preserve the persistence-provided
     current Admin data;
   - expose one pure name-edit authorization predicate used for response
     affordances and command policy;
   - permit an Active actor to edit self, an ordinary target when the actor is
     ordinary, and any current target when the actor is Super Admin;
   - permit an authorized actor to edit an Active or Disabled target because
     target Disable does not remove its current identity or name, while the
     actor must remain Active;
   - validate the submitted string as nonblank after trimming without making
     provider data authoritative or using name as identity; and
   - return an updated copy only after guarded persistence succeeds, preserving
     ID, external principal, state, authority, and any relationships.
2. Extend existing Admin persistence:
   - find one current Admin by stable domain ID;
   - list every current row in deterministic case-insensitive name/ID order;
   - guard listing against the current actor remaining Active;
   - update only `name` where the actor still exists and is Active and the
     current target authority remains allowed for that actor/self pair; and
   - classify stale actor, deleted target, newly promoted protected target, or
     unexpected zero-change outcomes without a second mutation.
3. Add authenticated Admin User HTTP:
   - `GET /api/admin/users` returns `{ adminUsers }`;
   - `GET /api/admin/users/:adminUserId` returns one current detail;
   - `PUT /api/admin/users/:adminUserId` accepts `{ name }` only;
   - every response excludes external principals, authentication/provider
     fields, Participant data, and relationships;
   - list/detail representations contain `id`, `name`, `state`, `authority`,
     and server-derived `isNameEditable` so the browser need not duplicate
     product authorization; and
   - unauthenticated, Disabled/missing actor, missing target, invalid name,
     stale authority, and technical failures receive narrow status/outcomes.
4. Add `/admin/users` and `/admin/users/:adminUserId` under the existing Active
   Admin route gate:
   - directory loading/error/empty/populated states and navigation from the
     administration entry;
   - a semantic desktop table plus narrow list/card alternative with explicit
     German authority and state labels;
   - stable direct detail/refresh with the name form only when
     `isNameEditable` is true;
   - provider-data notice, required-name validation, submission state,
     focused success, field error, and focused stale/unavailable error;
   - cache reconciliation for list, detail, and `/api/admin/me` so self-edit
     immediately updates the surrounding administration context; and
   - no promotion, Disable, Re-enable, delete, email, principal, or identity
     controls.
5. Use existing normal fixed identities in Playwright:
   - bootstrap `first-admin` as the real fixed Super Admin;
   - onboard existing fixed Admin-Invite principals as real ordinary Admins;
   - prove real list, self edit, ordinary-to-ordinary edit, ordinary-to-Super
     refusal, and Super-to-ordinary edit;
   - use narrow intercepted API state only for a second-Super presentation,
     Disabled actor/target presentation, and a stale promotion/deletion result
     that cannot yet be produced through product UI until `TASK-qhred` and
     `TASK-ikzih`; and
   - keep authoritative mutation and no-cascade evidence in Worker/D1 tests.
6. Update canonical product implementation status, architecture application/
   package/module/persistence/browser/runtime/status docs, process verification
   evidence, and all affected routing indexes. Existing dictionary terms
   already cover Admin User, Admin User name, and Super Admin, so no term
   definition change is expected.

## Non-Goals / Out Of Scope

- Promotion or demotion (`TASK-qhred`).
- Disable, Re-enable, delete, last-Active-Super-Admin enforcement, or lifecycle
  confirmations (`TASK-ikzih`).
- Admin email/profile expansion, provider synchronization, principal/account
  linking, identity merge/transfer, pagination, search, or audit history.
- A new schema migration, API application, workspace, package, first-level
  module, boundary-map permission, generic profile abstraction, or shared
  transport layer.
- Test-only booking-identity creation or mutation routes.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Keep the slice in existing `admin-access` and `admin-bootstrap`/browser `admin-access` owners | Admin User policy already has one conceptual owner; HTTP, D1, and MUI remain application-private. |
| Allow authorized name editing of Disabled targets | Disable retains the current Admin identity and name; only the actor must be Active, and later lifecycle policy remains separate. |
| Return server-derived `isNameEditable` | The browser shows only currently permitted edit UI without duplicating the ordinary/Super/self matrix. |
| Guard name update in one SQL statement | The target name changes only if current actor state and target authority still authorize that exact pair. |
| Reuse existing schema and fixed sessions | Current columns express the feature, while fixtures remain authentication-only and later lifecycle actions are not pulled forward. |
| Use table/card responsive alternatives | The directory remains scannable on desktop and usable at 360px without horizontal overflow. |

## Phases

### Phase 1: Domain Policy And Guarded Persistence

- [x] Add/export list, edit-authorization, and name-update operations with the
      complete self/ordinary/Super/Active/Disabled matrix.
- [x] Extend Admin persistence with ID lookup, deterministic guarded list, and
      one authoritative name-only guarded update.
- [x] Prove stale actor/promotion/deletion, atomicity, exact field retention,
      duplicate-name independence, and same-principal Participant isolation.

**Checkpoint**: An accepted edit changes only one name; an unauthorized or
stale edit changes no Admin or Participant fact.

### Phase 2: Narrow HTTP And Composition

- [x] Add exact collection/detail/PUT route matching and fresh authentication/
      Admin-context authorization.
- [x] Return narrow current representations and server-derived edit
      affordances with sanitized refusal/technical outcomes.
- [x] Compose/export the handler without changing dependency maps or runtime
      capabilities.

**Checkpoint**: Every Admin User request rechecks current domain authority and
no principal, provider, Participant, or relationship data crosses HTTP.

### Phase 3: German Responsive Directory And Detail

- [x] Add Admin navigation, routes, TanStack queries/mutation, localized
      directory table/cards, and direct detail states.
- [x] Add the accessible name-only form, current-action presentation, cache
      reconciliation, and predictable success/error focus.
- [x] Prove real fixed Super/ordinary journeys plus bounded future-lifecycle
      UI contracts at desktop and 360px with keyboard and axe evidence.

**Checkpoint**: Active Admins see the truthful current directory and only
currently permitted editing UI across direct navigation and refresh.

### Phase 4: Documentation And Completion

- [x] Update canonical docs/status/indexes and confirm dictionary coverage.
- [x] Run focused suites and one uninterrupted final `pnpm check`.
- [x] Complete task/plan, sync/check Markplane, and make one semantic commit.

**Checkpoint**: Product truth, architecture, evidence, tracking, and history
agree before `TASK-qhred` begins.

## Testing Strategy

- Booking-domain Vitest owns list authorization, nonblank-name validation,
  self/ordinary/Super target matrix, Disabled-target treatment, exact object
  preservation, server-affordance predicate, and persistence outcomes.
- Worker/D1 Vitest owns deterministic current listing, narrow representations,
  guarded single-column edit, fresh actor/target authority, promotion and
  delete races, Disabled actor, Active/Disabled targets, duplicate names,
  same-principal Participant isolation, exact HTTP, production composition,
  and technical sanitization.
- Playwright owns real fixed Super/ordinary directory and edits, current-action
  refusal, direct refresh, responsive table/card presentation, loading/empty/
  unavailable/stale/success states, provider notice, keyboard/focus, privacy,
  overflow, and axe. Intercepts cover only lifecycle/promotion states whose
  producing actions belong to later tickets.
- `pnpm check` is the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration is added and no irreversible lifecycle
transition is introduced; already edited names remain valid booking-system
profile data if the feature was used before rollback.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is below the repository's 300-line source split threshold

## References

- `TASK-45jmb`
- `TASK-rrp92`
- `TASK-qhred`
- `TASK-ikzih`
- `TASK-ca46j`
- `docs/product/admin-access.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`
