---
id: PLAN-ybc4q
title: Implementation plan for Cancel Modules and preserve Selection history
status: done
implements:
- TASK-vwciv
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Module Cancellation And Selection History Implementation Plan

## Overview

Complete terminal Module cancellation inside the existing `course-structure`
responsibility. An Active Admin may cancel a same-Course Scheduled Module only
while one captured definite instant is strictly before its current `endsAt`.
The accepted operation changes only Module state from Scheduled to Cancelled;
identity, descriptive fields, schedule, and every retained Selection row stay
unchanged.

One guarded D1 update will recheck Active Admin/Course, Scheduled state, and
the exact accepted deadline. Existing Selection writes already require a
Scheduled Module, and Participant presentation already derives a retained
Cancelled-Module Selection as historical. Cancellation therefore needs no
Selection query, batch, migration, stored history flag, or derived-state
rewrite.

The stable Admin Module card will expose a German destructive confirmation
only when server-derived current state permits cancellation. After success it
will show terminal status and preserved-history copy. A real browser journey
will retain an existing Participant Selection and prove historical read-only
presentation after cancellation.

## Ground Truth

- `.markplane/backlog/items/TASK-vwciv.md` — exact upcoming/in-progress,
  exact-end, terminal, retained-history, concurrency, UI, and evidence scope.
- `docs/product/course-structure.md#cancellation` — Active Admin/Course,
  Scheduled state, `now < endsAt`, terminal transition, and Selection retention.
- `docs/product/module-participation.md#module-cancellation-and-course-archival`
  — cancellation changes retained Selection meaning without changing its row
  or adding a Selection lifecycle.
- `docs/product/representative-scenarios.md#q-module-cancellation-boundary` and
  `#w-live-and-historical-selection-transitions` — exact-end refusal and
  immediate historical transition.
- `docs/product/domain-model.md#time-and-lifecycle` — complete Module state
  model, definite-instant boundary, and terminal cancellation invariant.
- `packages/booking/src/course-structure/createArchiveGroup.js` — one injected
  instant, lifecycle validation, guarded persistence, and retained-row result
  patterns.
- `packages/booking/src/module-participation/getModuleSelectionRefusal.js` and
  `deriveModuleSelectionPresentation.js` — current Module state already blocks
  every Selection mutation and derives Cancelled history.
- `apps/booking-system-web/migrations/0003_groups_and_modules.sql` and
  `0006_module_selections.sql` — constrained Scheduled/Cancelled state and
  restrictive retained Selection references; no schema change is required.
- `apps/booking-system-web/src/worker/course-structure/createModulePersistence.js`
  and `createModuleEditingPersistence.js` — current Module capabilities,
  guarded state classification, stable row mapping, and schedule lock.
- `apps/booking-system-web/src/worker/course-structure/courseHttpContract.js`
  and `createCourseHttpHandler.js` — nested action matching, current-time
  representation, fresh Admin authorization, stale resolution, and sanitized
  failures.
- `apps/booking-system-web/src/browser/course-structure/ModuleManagementCard.jsx`,
  `useCourses.js`, `GroupDeletionDialog.jsx`, and `useGroupDeletion.js` — stable
  card action, cache reconciliation, destructive Dialog, and focus patterns.
- `apps/booking-system-web/src/worker/course-access/createParticipantCourseHttpHandler.js`
  and `src/browser/course-access/ParticipantCourseStructure.jsx` — truthful
  Cancelled state, historical own Selection, and locked controls.
- `docs/architecture/applications.md`, `persistence.md`,
  `browser-conventions.md`, and `docs/process/verification.md` — same-origin
  lifecycle resource, D1 safety, browser interaction, and layered evidence.

No relevant adjacent `*.docs.md` exists for the inspected source,
configuration, migration, or test files.

## Approach

1. Add `createCancelModule` to booking `course-structure`:
   - accept only an Active Admin, Active Course, and same-Course Scheduled
     Module with valid definite instants;
   - capture injected `now` once and refuse at `now >= endsAt`;
   - send only Admin/Course/Module identities and the captured epoch to one
     guarded cancellation capability;
   - return the same Module with only state changed to `cancelled`; and
   - expose no uncancel operation or Selection input.
2. Extend Module D1 persistence without a migration:
   - compose a focused cancellation capability into Module persistence;
   - perform one `Scheduled -> Cancelled` update guarded by current Active
     Admin/Course and `ends_at > acceptedNowEpoch`;
   - classify stale actor/Course, missing Module, terminal/current-state loss,
     deadline reached, and unexplained failure;
   - leave title, description, instructions, start/end, Course, and every
     Selection row untouched; and
   - preserve rollback on a technical trigger failure.
3. Add one stable lifecycle action resource:
   - `POST /api/admin/courses/:courseId/modules/:moduleId/cancellation`;
   - derive Admin, Course, Module, state, and accepted instant server-side and
     accept no request-body trust fields;
   - return `200 { outcome: "cancelled", module }`, exact actor refusals,
     `404` for unknown/cross-Course Module, `409` for terminal/deadline/stale
     state, and sanitized `500`;
   - add server-derived `isCancellationAvailable` to Admin Module responses
     when state is Scheduled and `now < endsAt`; and
   - keep the guarded update authoritative if time/state changes after render.
4. Add German stable-card cancellation interaction:
   - show the action for server-derived eligible upcoming/in-progress Modules;
   - use a destructive MUI Dialog naming the Module, focusing Cancel first,
     trapping focus, restoring the action on cancel, and focusing exact stale/
     deadline/technical failures;
   - explain before confirmation and after terminal success that existing
     Selections remain as history and cannot be changed;
   - invalidate Admin and Participant Course detail caches after success and
     Admin detail on conflicts;
   - continue rendering descriptive editing for Cancelled Modules while the
     existing schedule area stays locked; and
   - add no Module route or Admin participation roster before `TASK-49if4`.
5. Prove atomic current-state behavior:
   - domain tests cover upcoming, exact-start, in-progress, exact-end, ended,
     repeat, invalid ownership/state, one captured clock, and persistence
     propagation;
   - real D1 tests retain upcoming/in-progress/ended Selection rows, preserve
     all Module fields, and race cancellation against Selection mutation,
     rescheduling, descriptive editing, actor/Course state, and failures;
   - HTTP tests cover auth/production, no-body trust, cross-Course privacy,
     current representation, stale/deadline outcomes, retained Participant
     historical presentation, and sanitization; and
   - Playwright uses a real upcoming Module with a real Selection for Admin
     cancellation then Participant history, plus bounded in-progress/exact-end
     and technical states unavailable through current public creation APIs.

## Non-Goals / Out of Scope

- Module deletion (`TASK-3zcmt`) or Course archival (`TASK-fzniz`).
- Administrative participation inspection (`TASK-49if4`) or Admin-assisted
  Selection mutation (`TASK-2nh3b`).
- Uncancel/reactivation, attendance, notifications, cancellation reason,
  audit/revision history, schedule history, or undo.
- Selection deletion, mutation, cloning, or a stored live/historical state as
  a cancellation side effect.
- A migration, new browser route, test-only endpoint, dependency, package,
  first-level module, boundary permission, or architecture checker.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| State-only guarded update | Retained Selections become historical from surrounding Module state; changing or batching them would invent a second lifecycle. |
| Strict `now < endsAt` with one captured instant | The contract includes in-progress cancellation and excludes exact end without browser-clock authority. |
| Action subresource | Cancellation is a terminal transition with no body, distinct from descriptive and schedule replacement. |
| Server-derived action availability | Admin presentation starts truthful while the guarded D1 update still decides stale races. |
| Stable Module card and focused Dialog | Cancellation is owned interaction state, not an independently navigable view. |
| Real Participant history, bounded temporal Admin states | Public APIs create only future Modules; Worker/D1 owns real in-progress/exact-end semantics without a test-only backdoor. |

## Phases

### Phase 1: Domain Policy And Guarded Persistence

- [x] Add the cancellation factory, exports, and exact injected-time matrix.
- [x] Add guarded D1 state transition and authoritative refusal classification.
- [x] Prove row/Selection preservation, deadline edges, concurrency, and
      rollback without a migration.

**Checkpoint**: Only a current eligible Scheduled row changes to Cancelled;
every other Module field and Selection row remains identical.

### Phase 2: HTTP Contract And Derived Presentation

- [x] Add cancellation route/dispatch with narrow result and privacy mapping.
- [x] Derive cancellation availability alongside schedule editability.
- [x] Prove fresh authorization, current deadline/state, no-body trust,
      Participant historical meaning, and technical sanitization.

**Checkpoint**: The same-origin API exposes one authoritative terminal action
and current Admin/Participant reads immediately reflect it.

### Phase 3: German Destructive Interaction

- [x] Add Module cancellation mutation, stable-card control, and focused Dialog.
- [x] Keep Cancelled descriptive editing while schedule/Selection controls lock.
- [x] Add real and bounded Playwright cancellation/history/deadline journeys
      with refresh, keyboard/Dialog/result focus, desktop/360px, and axe.

**Checkpoint**: Admin and Participant views communicate terminal state and
retained history without color-only meaning or stale interactive controls.

### Phase 4: Documentation, Verification, And Completion

- [x] Update canonical status, application/HTTP, persistence, package/module/
      browser/boundary, verification, dictionary, and index docs.
- [x] Run focused domain, Worker/D1, HTTP, and Playwright suites plus full
      `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-vwciv`.

**Checkpoint**: Product behavior, code, evidence, docs, tracking, and history
agree on terminal state-only cancellation and retained Selection history.

## Testing Strategy

- Booking-domain Vitest owns actor/Course/Module eligibility, upcoming/exact-
  start/in-progress/exact-end/ended boundaries, terminal repeat, stable fields,
  injected instant, and persistence outcomes.
- Worker/D1 Vitest owns the guarded transition, retained references and rows,
  cancellation/Selection/reschedule/edit races, stale current state, rollback,
  and no partial effect.
- Worker HTTP integration owns route/method/auth, cross-Course privacy,
  current availability, exact statuses/bodies, Participant derived history,
  production composition, and sanitized technical errors.
- Playwright owns German confirmation/terminal copy, real retained Participant
  history and prohibited mutation, bounded in-progress/exact-end refusal,
  direct refresh, responsive layout, keyboard/Dialog/result focus, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced. A
Module already Cancelled while the feature is in use remains terminal product
data and is not automatically restored, matching the explicit absence of an
uncancel workflow.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is focused on one Module cancellation task

## References

- `TASK-vwciv`
- `docs/product/course-structure.md`
- `docs/product/module-participation.md`
- `docs/product/representative-scenarios.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/process/verification.md`

## Implementation Evidence

- `createCancelModule` and its focused domain matrix express one captured
  before-`endsAt` policy, terminal Scheduled-to-Cancelled transition, complete
  field retention, and exact current-context refusals.
- D1 cancellation changes only Module state and keeps every retained Selection
  row. Focused Worker evidence covers current actor/Course/time/state,
  restrictive references, cancellation/booking/reschedule/edit interleavings,
  repeat attempts, and technical rollback without a migration.
- The same-origin body-free `POST` resource, server-derived action capability,
  stable German MUI Dialog/card, and Participant cancellation lock preserve
  domain, transport, presentation, privacy, and focus boundaries.
- Full `pnpm check` passed on 2026-08-29 with 329 domain, 276 Worker/D1, and 42
  Chromium tests plus ESLint/boundary enforcement and production builds.
