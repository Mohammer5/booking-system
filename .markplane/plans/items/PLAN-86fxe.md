---
id: PLAN-86fxe
title: Implementation plan for Disable, re-enable, and delete Admin Users
status: done
implements:
- TASK-ikzih
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Admin User Lifecycle Implementation Plan

## Overview

Complete the current Admin User management slice with Disable, Re-enable, and
delete commands. A pure booking-domain policy derives each permitted action
from freshly resolved actor and target data; guarded D1 statements revalidate
the same policy atomically before changing state or removing the current Admin
identity. The existing directory/detail HTTP representations carry
server-derived lifecycle affordances, and both responsive views share one
German MUI control with explicit consequences and focus-safe outcomes.

Deletion must preserve all accepted product and historical records. The
current schema already keeps product entities independent from Admin Users,
but two historical attribution columns still use `ON DELETE SET NULL`. An
additive migration will rebuild those tables without current-identity foreign
keys so the accepted Admin Invite and first-bootstrap records retain the
deleted Admin ID as historical data. No authentication identity, Participant,
booking content, session, or accepted action is deleted.

## Ground Truth

- `.markplane/backlog/items/TASK-ikzih.md` — exact authority matrix,
  self-protection, final-Active-Super invariant, identity and non-cascade
  semantics, German UI, and required evidence.
- `docs/product/admin-access.md#authority-and-lifecycle`,
  `#ordinary-admin-user-authority`,
  `#super-admin-administration-and-self-protection`,
  `#at-least-one-active-super-admin`, `#no-cascades`, and
  `#authoritative-current-state` — canonical lifecycle policy and fresh-state
  acceptance rule.
- `docs/product/domain-model.md#administration-and-invitations` and hard
  invariants 35–42 — current Admin identity, authority/state ownership,
  deletion/return, and Participant independence.
- `docs/product/representative-scenarios.md#z-super-admin-protection`,
  `#ac-deleted-admin-return`, `#af-admin-disable-or-deletion-does-not-cascade`,
  and `#ah-stale-admin-lifecycle-action` — final-Super, Invite return,
  historical fact, and stale-request examples.
- `docs/product/non-goals.md#identity-participant-and-admin-lifecycle` — no
  demotion, transfer, authentication deletion, Participant cascade, or audit
  workflow.
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
  — sessions retain only external principal identity and resolve current Admin
  state/authority on each booking request.
- `packages/booking/src/admin-access/createPromoteAdminUser.js` and
  `isAdminUserPromotable.js` — current pure-affordance and composed-operation
  conventions.
- `packages/booking/src/course-access/createDisableParticipant.js` and
  `createReenableParticipant.js` — established state transition operation
  shape without Admin-specific policy reuse.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminPersistence.js`
  — current identity lookups, directory, guarded edits, and row mapping.
- `apps/booking-system-web/src/worker/course-access/createParticipantPersistence.js`
  — guarded D1 lifecycle and exact refusal classification conventions.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminUserHttpHandler.js`
  — exact route matching, fresh authorization, narrow no-store response, and
  sanitized outcome translation.
- `apps/booking-system-web/src/browser/admin-access/AdminUserDirectoryPage.jsx`,
  `AdminUserDetailPage.jsx`, and `useAdminUsers.js` — current responsive
  directory/detail and server-state cache ownership.
- `apps/booking-system-web/src/browser/course-access/ParticipantLifecycleControl.jsx`
  and `admin-access/AdminUserPromotionControl.jsx` — established dialog,
  loading, cancellation, error, success, and focus patterns.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql` and
  `0008_admin_invites.sql` — the two historical Admin references currently use
  `ON DELETE SET NULL`.
- `apps/booking-system-web/migrations/0002_courses.sql` through
  `0007_course_invites.sql` — Courses, Groups, Modules, Participants,
  Assignments, Selections, and Course Invites have no Admin foreign key.
- `apps/booking-system-web/src/worker/admin-bootstrap/adminInviteMigration.worker.test.js`
  and `adminInviteClaimPersistence.worker.test.js` — migration integrity and
  deleted-principal Invite-return evidence to extend.
- `docs/process/verification.md` — layered domain, Worker/D1, fixed-session,
  responsive, keyboard/focus, privacy, and axe evidence.

The co-located docs check found no adjacent `*.docs.md` in the affected Admin
domain, Worker, browser, migration, or browser-test directories.

## Approach

1. Add a pure lifecycle affordance derivation and three composed operations
   under `packages/booking/src/admin-access`:
   - require an Active actor and a different current target;
   - let an ordinary actor manage only ordinary targets and a Super actor
     manage ordinary or Super targets;
   - offer Disable for Active targets, Re-enable for Disabled targets, and
     delete for either state;
   - distinguish self-protection, Super-target authority, missing target,
     stale state, and final-Active-Super refusals; and
   - return preserved target data with only `state` changed, or the deleted ID
     after successful removal.
2. Add `createAdminUserLifecyclePersistence.js` and compose its three narrow
   capabilities into `createAdminPersistence.js`:
   - each SQL statement freshly requires an Active actor, authorized
     actor/target authority pair, and `actor.id <> target.id`;
   - Disable and delete of an Active Super additionally require more than one
     currently Active Super in the same statement;
   - Re-enable changes only `state`; Disable changes only `state`; delete
     removes only the current `admin_users` row;
   - zero changes are classified from current actor/target/count state; and
   - D1 serialization plus the count guard makes concurrent final-Super
     attempts one accepted mutation followed by one refusal, without partial
     effects.
3. Add migration `0009_admin_user_deletion_history.sql`:
   - rebuild `admin_bootstrap_history` and `admin_invites` with their existing
     checks, uniqueness, values, indexes, and Invite immutability triggers;
   - keep Admin ID attribution columns as historical text without foreign keys
     to the current Admin identity table;
   - preserve every existing row and value during table replacement; and
   - leave all booking-domain entity schemas unchanged.
4. Extend the existing Admin User HTTP handler:
   - exact `POST /api/admin/users/:id/disablement` and
     `POST /api/admin/users/:id/reenablement` commands;
   - exact `DELETE /api/admin/users/:id` identity deletion;
   - fresh authentication and D1-backed Admin-context resolution for every
     command, followed by a fresh target lookup and guarded persistence;
   - collection/detail/success responses expose
     `isDisableAvailable`, `isReenableAvailable`, and `isDeleteAvailable`,
     plus a safe lifecycle restriction for explicit self/authority messaging;
   - deletion success returns the removed ID only; and
   - refusal/status mapping stays narrow, no-store, and technically sanitized.
5. Add `AdminUserLifecycleControls.jsx` for directory rows/cards and detail:
   - render only server-permitted actions while showing an explicit read-only
     self/Super-target explanation on detail;
   - confirm Disable and delete with access-loss and complete non-cascade copy;
   - explain that deletion is permanent for the current Admin identity, keeps
     the authentication session, and requires a new Invite/new ordinary Admin
     identity to return;
   - explain Re-enable identity/authority preservation;
   - focus Cancel on open, restore the opener on dismissal, focus in-dialog
     stale/error, and focus a durable success result; and
   - disable commands while pending with keyboard and responsive operation.
6. Extend `useAdminUsers.js` with the three mutations:
   - accepted Disable/Re-enable replace the target in detail/directory caches;
   - accepted delete removes it from directory and detail caches;
   - stale/actor failures invalidate directory, target detail, and current
     Admin context so permitted actions are re-derived; and
   - directory owns deletion success after row unmount, while detail navigates
     to the directory with safe completion state.
7. Add focused domain, Worker/D1, HTTP, migration, and Playwright evidence,
   then update canonical implementation/architecture/status/verification docs
   and indexes. Review dictionary coverage; update only if stable terminology
   changed.

## Non-Goals / Out of Scope

- Super Admin demotion, authority transfer/succession, or self lifecycle.
- Better Auth user/session deletion, provider profile mutation, Admin identity
  merge/link/transfer, or a role/authority session claim.
- Participant Disable/Re-enable/delete, Participant cascade, shared-principal
  coupling, Course/Group/Module/Assignment/Selection/Invite mutation, or
  historical-action reversal.
- Complete audit logging, Admin replacement workflows, fixture expansion, or
  deterministic final acceptance owned by `TASK-h37zt`.
- A generic lifecycle framework, new dependency, package, application,
  boundary-map permission, architecture checker, or test-only mutation route.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Keep lifecycle in Admin User management | State and deletion govern current Admin identity and compose with its existing directory/detail contract. |
| Return server-derived action affordances | Browser presentation does not duplicate actor/target authority policy. |
| Guard final-Super count in the mutating SQL | Fresh prechecks aid messages; only the acceptance statement can make concurrent/stale safety atomic. |
| Treat deleted Admin IDs as historical attribution | Accepted bootstrap and Invite records remain authoritative without pretending the removed current identity still exists. |
| Split lifecycle persistence from the existing factory | Three guarded commands and classifiers stay locally owned without pushing the existing source past the repository split threshold. |
| Use command POSTs for state changes and DELETE for identity removal | Routes express explicit transitions and prevent a browser-supplied generic state/authority replacement. |
| Keep success outside a deleted row | Removing the row cannot unmount the only accessible completion announcement. |

## Phases

### Phase 1: Domain Policy, Migration, And Atomic Persistence

- [x] Add/export lifecycle affordance derivation and Disable, Re-enable, delete
      operations with the complete actor/target matrix.
- [x] Add guarded lifecycle persistence, exact stale/final-Super
      classification, and technical rollback behavior.
- [x] Add the history-preserving migration and prove all existing values,
      checks, indexes, triggers, and named non-cascade records remain intact.

**Checkpoint**: Every accepted transition changes only current Admin identity
state/existence, and no refused, concurrent, or failed attempt changes any row.

### Phase 2: HTTP Contract And Fresh Identity Resolution

- [x] Add exact routes, operation composition, narrow affordances/restrictions,
      deletion result, and refusal translation.
- [x] Prove fresh actor/target state on every request, Disabled access loss,
      re-enabled same-session return, deleted same-session no-Admin result, and
      atomic concurrent final-Super refusal.
- [x] Prove a deleted principal can claim only a new Invite as a new ordinary
      Admin identity while its Participant and historical records persist.

**Checkpoint**: The HTTP boundary accepts only freshly authorized actions and
the next request always observes authoritative current Admin state.

### Phase 3: German Responsive Lifecycle Experience

- [x] Add lifecycle mutations and shared directory/detail controls with
      destructive consequence/non-cascade copy.
- [x] Implement permitted-action visibility, explicit read-only restrictions,
      cache reconciliation/removal, and durable success/stale/error focus.
- [x] Prove real fixed Admin/Super journeys plus bounded stale/final-Super
      presentation at desktop and 360px with keyboard, dialog focus,
      restoration, direct refresh, overflow, privacy, and axe evidence.

**Checkpoint**: Users see only currently permitted commands, understand their
effects, and receive accessible authoritative outcomes after every action.

### Phase 4: Documentation And Completion

- [x] Update canonical product/architecture/status/verification docs and
      indexes; confirm dictionary and co-located documentation coverage.
- [x] Run focused domain, migration, Worker/D1, HTTP, build, and Playwright
      evidence, then one uninterrupted final `pnpm check`.
- [x] Complete task/plan acceptance, sync/check Markplane, inspect the final
      diff, and create one semantic task commit.

**Checkpoint**: Product truth, schema, behavior, evidence, tracking, and Git
agree before `TASK-49if4` begins.

## Testing Strategy

- Booking-domain Vitest owns ordinary/Super/Disabled actor against
  ordinary/Super Active/Disabled/self/missing targets; derived actions; exact
  refusals; preservation on Re-enable; delete result; and absent demotion.
- Migration Vitest owns upgrade from migration 0008 with non-null bootstrap and
  Admin Invite attribution, preserved values/indexes/triggers, and successful
  deletion without attribution loss.
- Worker/D1 Vitest owns state-only updates, delete-only identity removal,
  accepted/refused concurrency, final-Active-Super count, fresh actor/target
  resolution, technical rollback, same-principal Participant independence,
  and byte-for-byte row stability across Courses, Groups, Modules,
  Participants, Assignments, Selections, Course Invites, and Admin Invites.
- Worker HTTP Vitest owns exact methods/paths, narrow responses, no-store,
  allowed/refused matrix, stale actions, same-cookie access transitions,
  Invite return with a new ordinary ID, and production composition.
- Playwright owns real first-Super/invited Admin setup, promotion prerequisite,
  ordinary/Super action visibility, Disable/Re-enable/delete, post-action
  access, shared Participant independence, Invite return, removed rows,
  desktop/narrow presentation, keyboard/focus, bounded concurrent/stale
  outcomes, refresh, privacy, overflow, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. The forward migration intentionally preserves
historical IDs and can remain compatible with older code because neither
application query relies on the removed foreign keys. Accepted Admin state or
identity deletions are product data and are not automatically undone; restore
them only from an explicit backup or through the supported new-Invite return
flow.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan remains below the repository's 300-line source split threshold

## References

- `TASK-ikzih`
- `TASK-qhred` / `PLAN-vyd23`
- `TASK-rrp92`
- `TASK-25j4s`
- `TASK-h37zt`
- `docs/product/admin-access.md`
- `docs/product/domain-model.md`
- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`
