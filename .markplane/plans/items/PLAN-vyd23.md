---
id: PLAN-vyd23
title: Implementation plan for Promote Admin Users to Super Admin
status: done
implements:
- TASK-qhred
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Super Admin Promotion Implementation Plan

## Overview

Add the explicit, one-way promotion action to the current Admin User management
slice. Promotion eligibility is derived from freshly resolved actor and target
data, then revalidated inside one guarded D1 authority-only update. The existing
Admin User directory/detail responses expose a server-derived promotion
affordance, and both responsive views use one German MUI confirmation control
that explains permanence and owns focus-safe success and stale outcomes.

The existing schema already supports several Super Admins. This task therefore
adds no migration, authentication/session claim, fixture identity, dependency,
package, responsibility, or boundary-map permission. Admin User lifecycle and
last-Active-Super-Admin protection remain in `TASK-ikzih`.

## Ground Truth

- `.markplane/backlog/items/TASK-qhred.md` — exact eligibility, identity
  preservation, fresh authority, one-way behavior, responsive UI, and evidence.
- `docs/product/admin-access.md#super-admin-promotion` — Active-Super actor,
  other Active-ordinary target, identity preservation, multiple Super Admins,
  Invite isolation, and no demotion.
- `docs/product/admin-access.md#admin-user-view` and
  `#authoritative-current-state` — permitted action presentation and fresh
  acceptance-time actor/target resolution.
- `docs/product/domain-model.md#super-admin` and hard invariants 35–40 —
  authority belongs to Admin User state rather than authentication or
  Participant identity.
- `docs/product/representative-scenarios.md#y-super-admin-promotion` — expected
  coexistence and Disabled-target prerequisite.
- `docs/product/non-goals.md#identity-participant-and-admin-lifecycle` — no
  demotion, transfer, succession, merge, or audit workflow.
- `docs/architecture/authentication-and-sessions.md#accepted-composition` —
  sessions carry only stable external principal identity; every request
  resolves current Admin authority from booking state.
- `packages/booking/src/admin-access/isAdminUserNameEditable.js` and
  `createUpdateAdminUserName.js` — current pure-affordance and guarded-operation
  conventions in the owning domain responsibility.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminPersistence.js`
  — existing Admin row mapping, current actor checks, and guarded name update.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminUserHttpHandler.js`
  — exact collection/detail matching, fresh authorization, narrow no-store
  representations, and sanitized error translation.
- `apps/booking-system-web/src/browser/admin-access/AdminUserDirectoryPage.jsx`,
  `AdminUserDetailPage.jsx`, and `useAdminUsers.js` — current responsive
  directory/detail and cache ownership.
- `apps/booking-system-web/src/browser/admin-access/AdminInviteRevocationDialog.jsx`
  and `course-access/ParticipantLifecycleControl.jsx` — established dialog
  cancel/error/success focus and restoration patterns.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql` — existing
  `admin_users.authority` constraint supports `admin` and `super-admin` without
  schema work.
- `docs/process/verification.md` — layered domain, Worker/D1, fixed-session,
  responsive, keyboard/focus, privacy, and axe evidence.

The co-located docs check found no adjacent `*.docs.md` in the affected Admin
domain, Worker, browser, composition, fixture, or migration directories.

## Approach

1. Add a pure `isAdminUserPromotable` predicate and a composed promotion
   operation under `packages/booking/src/admin-access`:
   - require the actor to be Active with `super-admin` authority;
   - require a different, current Active target with ordinary `admin`
     authority;
   - refuse ordinary/Disabled actors, self, missing/Disabled/already-Super
     targets before persistence;
   - call one injected guarded promotion capability; and
   - on success return a copy with only authority changed to `super-admin`.
2. Extend `createAdminPersistence.js` with one guarded authority update:
   - target row must still be Active, ordinary, and different from the actor;
   - actor row must still be Active and Super Admin;
   - SQL updates only `authority`, so identity, principal, name, state, and all
     referencing relationships remain unchanged;
   - zero changes are classified as inactive actor, missing target, or no
     longer promotable; and
   - two concurrent attempts yield one success and one coherent stale refusal.
3. Extend existing Admin User HTTP rather than create another handler:
   - exact `POST /api/admin/users/:adminUserId/promotion` route;
   - fresh authentication and Admin-context resolution on every request;
   - `isPromotionAvailable` beside `isNameEditable` in collection/detail and
     successful promotion representations;
   - success returns the same narrow current Admin User shape; and
   - unauthenticated, inactive actor, missing target, stale/ineligible, and
     technical results remain no-store and privacy-safe.
4. Add a dedicated `AdminUserPromotionControl.jsx` used by directory rows,
   narrow cards, and detail:
   - render the Promote action only when the server affordance is true;
   - identify the target and permanent one-way authority change in German;
   - focus Cancel when opened, restore the opener after cancellation, focus an
     in-dialog refusal, and focus an out-of-dialog success result;
   - disable actions while pending and support Escape, Tab, Enter, and pointer;
   - retain the component after success so the focused result is not unmounted
     when the affordance becomes false; and
   - expose no demotion control or implied alternate promotion path.
5. Add a promotion mutation to `useAdminUsers.js`:
   - POST the exact action route without authority input from the browser;
   - replace the target in directory and detail caches from the authoritative
     response;
   - on stale/actor errors invalidate directory, detail, and current Admin
     context so permitted actions are re-derived; and
   - rely on the next authenticated request's D1-backed context resolution for
     the promoted user's immediate Super Admin authority.
6. Add focused evidence in new promotion-specific domain, Worker/D1, Worker
   HTTP, and Playwright files while updating existing narrow-response contract
   assertions. Existing Admin Invite claim tests remain evidence that Invites
   create only ordinary Admin Users; no Invite implementation changes.
7. Update product implementation status, architecture application/package/
   module/persistence/browser/runtime/decision/status docs, process verification
   evidence, and all affected indexes. Existing `Super Admin` and `Admin User`
   dictionary definitions already state promotion semantics, so no terminology
   edit is expected.

## Non-Goals / Out Of Scope

- Super Admin demotion, authority transfer, or succession.
- Admin User Disable, Re-enable, delete, self-protection for those actions, or
  the last-Active-Super-Admin invariant (`TASK-ikzih`).
- New Admin identities, Admin Invite changes, bootstrap changes, identity
  merge/link/transfer, Participant mutation, relationship rewrites, or audit
  history.
- A migration, session claim, API application, package, responsibility module,
  generic authorization abstraction, dependency, or boundary-map change.
- Test-only booking-identity creation or mutation routes.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Keep promotion in existing Admin User management | The action changes Admin User authority and naturally composes with the existing directory/detail operation. |
| Return `isPromotionAvailable` from the server | The browser presents only permitted actions without duplicating actor/target policy. |
| Use an explicit action POST route | Promotion is a one-way domain command, not a browser-supplied generic authority replacement. |
| Refuse a losing concurrent promotion coherently | The first guarded update wins; later attempts see an already-Super target and make no mutation. |
| Update only `authority` in guarded SQL | Stable identity and every other Admin/Participant/relationship fact remain structurally untouched. |
| Keep the confirmation in a dedicated component | Directory and detail need identical permanence copy and accessible focus behavior without enlarging either page owner. |

## Phases

### Phase 1: Domain Policy And Atomic Persistence

- [x] Add/export the pure promotion predicate and composed operation with the
      complete actor/target matrix and identity-preserving success result.
- [x] Add one guarded authority-only D1 update and exact stale classification.
- [x] Prove multiple Super Admins, concurrent attempts, field/reference
      preservation, no Participant cascade, and technical rollback.

**Checkpoint**: Exactly one eligible promotion changes exactly one authority;
all refused or failed attempts leave every stored fact unchanged.

### Phase 2: HTTP Contract And Fresh Session Resolution

- [x] Add exact promotion route matching, operation composition, and refusal
      translation to the existing Admin User handler.
- [x] Add `isPromotionAvailable` to all narrow Admin User representations and
      keep principals/provider/Participant/relationship data private.
- [x] Prove that an already-established ordinary session receives Super Admin
      mutation authority immediately after promotion through fresh D1-backed
      context resolution, not session claims.

**Checkpoint**: Promotion authority enters through one authenticated command,
and the same session's next request observes current domain authority.

### Phase 3: German Responsive Promotion Experience

- [x] Add the query mutation and shared directory/detail confirmation control.
- [x] Implement permanent-change copy, actor-specific action visibility,
      immediate cache reconciliation, and success/stale focus behavior.
- [x] Prove real fixed Super/ordinary promotion, refusal and no-demotion
      presentation plus bounded Disabled/stale contracts at desktop and 360px
      with keyboard, focus restoration, overflow, privacy, and axe evidence.

**Checkpoint**: Only eligible targets expose Promote, the one-way consequence
is explicit, and accepted/stale results remain clear and accessible.

### Phase 4: Documentation And Completion

- [x] Update canonical docs/status/indexes and confirm dictionary coverage.
- [x] Run focused domain, Worker/D1, HTTP, build, and Playwright evidence, then
      one uninterrupted final `pnpm check`.
- [x] Complete task/plan acceptance, sync/check Markplane, and make one
      semantic task commit.

**Checkpoint**: Product truth, architecture, evidence, tracking, and history
agree before `TASK-ikzih` begins.

## Testing Strategy

- Booking-domain Vitest owns the full Active/Disabled, ordinary/Super,
  self/other, Active/Disabled/already-Super/missing target matrix, exact object
  preservation, predicate derivation, guarded outcomes, and absent demotion.
- Worker/D1 Vitest owns one-column atomic update, fresh actor/target guards,
  same-target concurrency, several Super rows, row/reference preservation,
  same-principal Participant isolation, and forced SQL rollback.
- Worker HTTP Vitest owns exact route/method matching, narrow response shape,
  ordinary/Disabled/self/stale refusals, production composition, no-store,
  technical sanitization, and same-cookie post-promotion Super authority.
- Playwright owns real fixed first-Super/invited-ordinary presentation and
  promotion, ordinary refusal, immediate promoted authority, persistence after
  refresh, no demotion, desktop table/narrow card actions, dialog keyboard and
  cancel/error/success focus, bounded Disabled/stale presentation, privacy,
  overflow, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration exists to roll back. An Admin User
promoted before a code rollback remains valid stored Super Admin data already
supported by the existing schema and bootstrap behavior; no automatic demotion
is attempted.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan remains below the repository's 300-line source split threshold

## References

- `TASK-qhred`
- `TASK-45jmb`
- `TASK-ikzih`
- `docs/product/admin-access.md`
- `docs/product/domain-model.md`
- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`
