---
id: PLAN-wareq
title: Implementation plan for Delete unreferenced Modules
status: done
implements:
- TASK-3zcmt
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Unreferenced Module Deletion Implementation Plan

## Overview

Complete permanent Module deletion inside the existing `course-structure`
responsibility. An Active Admin may delete a same-Course Scheduled or
Cancelled Module in an Active Course only when no current `module_selections`
row references it. Time position is irrelevant: upcoming, exact-start,
in-progress, ended, and Cancelled Modules share the same retained-reference
rule.

The domain operation will make that rule explicit from a privacy-safe retained-
reference context. One guarded D1 delete will recheck Active Admin/Course,
same-Course ownership, and the absence of every current Selection. The
restrictive composite Selection foreign key remains the inverse race guard.
Deletion changes only the Module row; the existing permanent
`courses.has_ever_had_module` history remains `1`, so deleting the first, last,
or every current Module never restores timezone editability.

The existing nested Module resource will accept `DELETE` alongside descriptive
`PUT`. Stable Admin Course detail will add a separate German destructive
confirmation and parent-owned success focus. No Module route, deletion marker,
empty schedule history, migration, or Participant-facing tombstone is added.

## Ground Truth

- `.markplane/backlog/items/TASK-3zcmt.md` — complete retained-reference,
  lifecycle/time matrix, timezone history, destructive UI, concurrency, and
  evidence scope.
- `docs/product/course-structure.md#hard-deletion-1` — Active Course plus zero
  retained Selection rule for Scheduled/Cancelled and every time position.
- `docs/product/course-structure.md#course-timezone` — first successful Module
  creation freezes timezone permanently across deletion of every Module.
- `docs/product/representative-scenarios.md#r-module-deletion` and
  `#n-course-timezone-and-dst` — retained historical blocker and zero-current-
  Module timezone-lock examples.
- `docs/product/domain-model.md#time-and-lifecycle` — Module state/time model,
  authoritative deletion invariant, and valid zero-current-Module history.
- `packages/booking/src/course-structure/createDeleteGroup.js` and
  `groupDeletion.test.js` — reference-context validation, past-reference
  exclusion, narrow persistence input, and stale outcome propagation pattern.
- `apps/booking-system-web/migrations/0003_groups_and_modules.sql` — Module
  ownership plus permanent Course scheduling-history trigger and stored bit.
- `apps/booking-system-web/migrations/0006_module_selections.sql` — restrictive
  same-Course `(module_id, course_id)` foreign key that protects retained
  references without cascade.
- `apps/booking-system-web/src/worker/course-structure/createGroupDeletionPersistence.js`
  — guarded delete, current-state classification, restrictive-FK race, and
  technical-failure reclassification pattern.
- `apps/booking-system-web/src/worker/course-structure/createModulePersistence.js`
  and `createModuleManagementHttp.js` — current Module lookup/composition and
  item-resource edit dispatch.
- `apps/booking-system-web/src/worker/course-structure/createCourseHttpHandler.js`
  and `courseHttpContract.js` — same nested Module route, fresh Admin
  authorization, Course stale resolution, and narrow representations.
- `apps/booking-system-web/src/browser/course-structure/GroupDeletionDialog.jsx`,
  `useGroupDeletion.js`, and `GroupCreationSection.jsx` — destructive Dialog,
  focus restoration, cache invalidation, card unmount, and parent success focus.
- `apps/booking-system-web/src/browser/course-structure/ModuleManagementCard.jsx`
  and `ModuleCreationSection.jsx` — stable Module card/list ownership after
  editing, rescheduling, and cancellation.
- `docs/architecture/applications.md`, `persistence.md`,
  `browser-conventions.md`, and `docs/process/verification.md` — same-origin
  item deletion, D1 safety, MUI interaction, and layered evidence.

No relevant adjacent `*.docs.md` exists for the inspected source,
configuration, migration, or test files.

## Approach

1. Add `createDeleteModule` to booking `course-structure`:
   - accept only an Active Admin, Active Course, and same-Course Scheduled or
     Cancelled Module;
   - require a current Selection-context array and block on any retained row,
     without consulting Module state beyond the accepted lifecycle values or
     comparing `now`, `startsAt`, or `endsAt`;
   - ignore removed/replaced past references because they no longer exist;
   - call persistence with only Admin/Course/Module identities; and
   - return the unchanged deleted Module representation on success.
2. Extend Module D1 persistence without a migration:
   - compose a focused deletion capability into Module persistence;
   - list only minimal retained-reference context for domain policy, never
     Participant identity/profile data;
   - perform one guarded delete requiring current Active Admin/Course,
     same-Course Module existence, and no `module_selections` row for it;
   - classify stale actor, Course, missing Module, retained-reference blocker,
     and unexplained failure after zero changes or a thrown constraint/trigger;
   - rely on the restrictive composite foreign key to arbitrate deletion
     against concurrent Selection creation; and
   - prove the Course history bit remains `1` after first/last/every deletion.
3. Add deletion to the existing item HTTP resource:
   - `DELETE /api/admin/courses/:courseId/modules/:moduleId`;
   - derive Admin, Course, Module, and current references server-side and
     ignore any request body;
   - branch before JSON parsing so DELETE owns no field input;
   - return `200 { outcome: "deleted", module }`, exact actor refusals, `404`
     for unknown/cross-Course Module, `409 module-deletion-blocked` or stale
     state, and sanitized `500`; and
   - keep existing descriptive `PUT`, schedule, and cancellation resources
     unchanged.
4. Add stable German Module deletion interaction:
   - expose a distinct destructive action for every retained Module card,
     independent of Scheduled/Cancelled/time-derived presentation;
   - name the Module and permanence in a MUI Dialog, focus Cancel initially,
     trap focus, restore the action on dismissal, and focus privacy-safe
     blocker/stale/technical errors in the Dialog;
   - invalidate Admin and Participant Course detail after success;
   - announce deletion and focus from the parent Module section after the card
     unmounts, including a truthful empty list after the last deletion; and
   - leave Course timezone editing server-authoritative, showing the permanent
     zero-current-Module lock after refresh.
5. Prove current-state and structural safety:
   - domain tests cover Scheduled/Cancelled and upcoming/exact-start/in-
     progress/ended retained-reference matrices, removed past references,
     ownership/state refusal, and persistence propagation;
   - real D1 tests cover future/ended/Cancelled deletion, first/last/all
     history, non-cascade preservation, restrictive FK, deletion/Selection
     race, stale actor/Course/reference state, and rollback;
   - HTTP tests cover auth/production, body trust, cross-Course privacy,
     current reference insertion after the initial read, exact outcomes, and
     technical sanitization; and
   - Playwright covers real future and Cancelled deletion through the last row,
     permanent timezone refusal, plus bounded ended/blocker/stale/technical
     presentation where current public creation cannot create past Modules.

## Non-Goals / Out of Scope

- Course archival (`TASK-fzniz`) or any Course hard deletion.
- Admin participation inspection (`TASK-49if4`) or Admin-assisted Selection
  mutation (`TASK-2nh3b`).
- Module restore, archive, soft-delete state, tombstone, deleted-row audit,
  empty schedule history, schedule revision history, or notification.
- Selection deletion or mutation as a deletion side effect; a retained row is
  always a blocker.
- A migration, new browser route, test-only endpoint, dependency, package,
  first-level module, boundary permission, or architecture checker.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Existing Module item `DELETE` | Deletion removes the item and needs no lifecycle payload or new action-resource path. |
| One guarded row delete | The acceptance predicate and effect stay atomic; no preflight read becomes authoritative. |
| Restrictive FK as inverse race guard | Current schema already prevents a retained Selection from being orphaned and gives concurrent creation/deletion one valid winner. |
| Preserve `has_ever_had_module` untouched | It is permanent Course history, not a count derived from current Module rows. |
| Stable card plus parent success | Deletion is an owned interaction; the parent remains after the target card unmounts and can receive focus. |
| Real future/Cancelled plus bounded ended UI | Public APIs intentionally create only future Modules; past UI coverage needs no test-only write backdoor. |

## Phases

### Phase 1: Domain Policy And Guarded Persistence

- [x] Add the deletion factory, package exports, and full lifecycle/time/
      retained-reference matrix.
- [x] Add minimal reference read plus guarded D1 delete and exact refusal
      classification.
- [x] Prove non-cascade preservation, permanent timezone history, concurrency,
      and rollback without a migration.

**Checkpoint**: Only an unreferenced same-Course Module row is removed; all
other data and permanent Course scheduling history remain identical.

### Phase 2: Existing Item HTTP Contract

- [x] Add DELETE dispatch and body-free server-owned reference resolution.
- [x] Return narrow success/privacy/stale/blocker outcomes and sanitized
      failures.
- [x] Prove fresh authorization, cross-Course privacy, stale post-read
      references, production composition, and unchanged edit routes.

**Checkpoint**: The same nested Module resource exposes authoritative deletion
without accepting ownership, lifecycle, time, or Selection trust fields.

### Phase 3: German Destructive Interaction

- [x] Add Module deletion mutation, card action, focused Dialog, and localized
      blocker/permanence copy.
- [x] Add parent-owned success/empty-state focus and Admin/Participant query
      reconciliation.
- [x] Add real and bounded Playwright deletion/history/timezone journeys with
      refresh, keyboard, desktop/360px, and axe coverage.

**Checkpoint**: Eligible Modules disappear predictably while blockers remain
private, errors remain actionable, and last-row deletion never presents an
editable timezone.

### Phase 4: Documentation, Verification, And Completion

- [x] Update canonical status, application/HTTP, persistence, package/module/
      browser/boundary, verification, dictionary, and index docs.
- [x] Run focused domain, Worker/D1, HTTP, and Playwright suites plus full
      `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-3zcmt`.

**Checkpoint**: Product behavior, code, evidence, docs, tracking, and history
agree on reference-protected Module deletion and permanent timezone history.

## Testing Strategy

- Booking-domain Vitest owns actor/Course/Module eligibility, both Module
  states, every time position, all retained references, removed-reference
  absence, stable result data, and persistence outcome propagation.
- Worker/D1 Vitest owns guarded current-state deletion, restrictive references,
  all data preservation, permanent Course history, deletion/Selection races,
  stale actor/Course, and trigger rollback.
- Worker HTTP integration owns route/method/auth, body trust boundaries,
  same-Course privacy, post-read reference changes, exact status/body mapping,
  production composition, and technical sanitization.
- Playwright owns German future/Cancelled/ended presentation, destructive
  confirmation, blocker privacy, last-row empty state, timezone refusal,
  refresh, responsive layout, keyboard/Dialog/result focus, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced. A
Module already hard-deleted while the feature is in use cannot be reconstructed
automatically because the accepted product explicitly preserves no empty
schedule history; Course timezone history remains locked as designed.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is focused on one Module deletion task

## References

- `TASK-3zcmt`
- `docs/product/course-structure.md`
- `docs/product/domain-model.md`
- `docs/product/representative-scenarios.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`

## Implementation Evidence

- The exported booking operation and its 17 focused cases express the complete
  Active actor/Course, same-Course lifecycle, time-independent, and retained-
  reference policy while passing only stable identities to persistence.
- Focused D1 and HTTP adapters keep the read privacy-minimal and the accepting
  delete atomic. Twenty-six integration cases cover exact refusal mapping,
  non-cascade preservation, permanent scheduling history, stale state,
  restrictive-reference races, production composition, and sanitization.
- The existing item resource, German MUI destructive interaction, parent-owned
  result focus, dual detail invalidation, and two browser journeys preserve the
  established responsibility, transport, cache, privacy, and accessibility
  boundaries without a new route or dependency.
- Canonical status, architecture, verification, dictionary, and routing docs
  now describe unreferenced Module deletion and permanent Course timezone
  history. Full `pnpm check` passed on 2026-08-29 with 346 domain, 302 Worker/
  D1, and 44 Chromium tests plus ESLint/boundary enforcement and production
  builds.
