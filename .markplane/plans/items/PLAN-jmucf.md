---
id: PLAN-jmucf
title: Implementation plan for Edit and reschedule Modules
status: done
implements:
- TASK-2u7z6
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Module Editing And Rescheduling Implementation Plan

## Overview

Complete the existing `course-structure` Module responsibility with two
coherent but independent edits on stable Admin Course detail. Descriptive
fields remain editable for Scheduled or Cancelled Modules at any time while
the Course is Active. Schedule fields use a separate operation that accepts
only a Scheduled Module before its authoritative current `startsAt` and only a
new definite interval whose start is still strictly future.

The shared Course-local resolver will remain the only DST interpretation path.
The domain will capture one injected current instant and pass the expected old
schedule plus resolved new schedule to one guarded D1 update. That statement
will recheck current Active Admin/Course, unchanged Course timezone, Scheduled
state, expected old interval, and exact time eligibility without changing
Module identity or any Selection.

The browser will keep all interaction on `/admin/courses/:courseId`: each
Module card gets a descriptive form and a distinct schedule form. Server-
derived editability prevents a locked schedule from blocking descriptive
changes, while authoritative conflict responses refresh current Course detail.

## Ground Truth

- `.markplane/backlog/items/TASK-2u7z6.md` — exact temporal matrix, separate
  forms, retained Selection/deadline behavior, stale races, and required
  layered evidence.
- `docs/product/course-structure.md#descriptive-edits` and `#schedule-edits` —
  descriptive lifetime, strict pre-current-start schedule lock, valid future
  interval, identity/Selection retention, and Cancelled immutability.
- `docs/product/course-structure.md#course-timezone` — local minute input,
  definite instants, DST gap rejection, and explicit overlap occurrence.
- `docs/product/representative-scenarios.md#o-backdated-module-refusal` and
  `#p-module-deadline-and-schedule-immutability` — exact new-start and current-
  start boundary examples.
- `docs/product/module-participation.md#startsat-deadline` — all Selection
  mutation eligibility follows the Module's current stored `startsAt`.
- `packages/booking/src/course-structure/createCreateModule.js` and
  `resolveCourseLocalDateTime.js` — current injected-time, field validation,
  local-time resolution, overlap response, and plain Module patterns.
- `apps/booking-system-web/migrations/0003_groups_and_modules.sql` and
  `0006_module_selections.sql` — stable Module identity/Course ownership,
  interval constraint, Scheduled/Cancelled state, and restrictive retained
  Selection references; no new schema is required.
- `apps/booking-system-web/src/worker/course-structure/createModulePersistence.js`
  — current guarded insert, timezone recheck, deterministic reads, and Module
  row mapping.
- `apps/booking-system-web/src/worker/course-structure/createCourseHttpHandler.js`
  and `courseHttpContract.js` — current authorization/stale-state resolution,
  nested route dispatch, narrow Module representation, and sanitization.
- `apps/booking-system-web/src/browser/course-structure/ModuleCreationForm.jsx`,
  `ModuleScheduleChoice.jsx`, `ModuleCreationSection.jsx`, and `useCourses.js`
  — Course-local schedule controls, overlap choices, stable Module cards,
  TanStack reconciliation, React Hook Form, and predictable focus patterns.
- `apps/booking-system-web/src/worker/module-participation/createModuleSelectionPersistence.js`
  — authoritative Selection guard reads current `modules.starts_at`, so a
  successful reschedule shifts booking eligibility without Selection rewrite.
- `docs/architecture/applications.md`, `persistence.md`,
  `browser-conventions.md`, and `docs/process/verification.md` — current HTTP,
  D1, stable-detail interaction, and layered evidence ownership.

No relevant adjacent `*.docs.md` file exists for the concrete source,
configuration, migration, or test files inspected for this plan.

## Approach

1. Add two focused booking-domain operations:
   - `createUpdateModuleDetails` accepts an Active Admin, Active Course, and
     same-Course Scheduled or Cancelled Module, validates complete
     `{ title, description, instructions }`, and returns the same identity,
     state, and schedule with only those fields replaced after guarded success;
   - `createRescheduleModule` accepts only a same-Course Scheduled Module,
     captures injected `now` once, refuses when `now >= current startsAt`,
     resolves both local fields through the Course timezone, requires
     `newStartsAt > now` and `newEndsAt > newStartsAt`, and returns the same
     Module with only both instants replaced;
   - extract the now-concrete shared Module text validator and future-interval
     resolution from creation rather than duplicating DST/outcome behavior;
   - pass no Selection list or Participant data because retaining the Module
     row inherently retains every reference.
2. Extend Module D1 persistence without a migration:
   - compose a focused editing persistence capability into the existing
     Module persistence and add an exact same-Course `findModuleById` read;
   - guarded descriptive update rechecks current Active Admin/Course and one
     existing Scheduled/Cancelled Module, changing all three text fields in
     one statement while leaving identity/state/interval/references untouched;
   - guarded reschedule rechecks current Active Admin/Course and timezone,
     exact Module identity/Course, Scheduled state, expected current start/end,
     `current starts_at > acceptedNowEpoch`, and both new interval predicates;
   - classify stale actor/Course, missing Module, changed/cancelled/started
     schedule, timezone loss, and unexplained failure into narrow outcomes;
   - preserve trigger-failure rollback and let the existing Selection foreign
     key remain unchanged because no referenced key is updated.
3. Add two stable nested HTTP operations:
   - `PUT /api/admin/courses/:courseId/modules/:moduleId` owns complete
     descriptive fields;
   - `PUT /api/admin/courses/:courseId/modules/:moduleId/schedule` owns local
     start/end fields and optional overlap occurrences;
   - load Admin, Course, Module, ownership, timezone, and old definite interval
     server-side; ignore browser identity, state, definite-instant, and
     Selection trust fields;
   - return a narrow updated Module on `200`, field/DST/interval outcomes on
     `422`, `404` for mismatched/unknown Course or Module, `409` for locked or
     stale acceptance, exact actor refusals, and sanitized `500`;
   - derive `isScheduleEditable` in Admin Module representations from injected
     server time and current state, while keeping the write authoritative when
     the boundary passes after render.
4. Add separate German MUI forms on each retained Module card:
   - descriptive title/description/instructions form always remains present
     for current Active-Course detail and owns field/success/error focus;
   - schedule form shows current Course-local values and timezone, reuses the
     existing DST overlap candidate control with per-Module IDs/radio names,
     and clearly renders server-derived locked state without disabling the
     descriptive form;
   - a successful mutation invalidates both Admin and Participant Course
     detail so current schedule, content, and Selection availability refresh;
   - a `409` refreshes Admin detail and focuses stale/locked feedback;
   - direct refresh stays on stable Course detail; no Module route or dialog is
     introduced.
5. Keep proof proportional and exact:
   - domain Vitest covers text edits before/in-progress/ended/Cancelled,
     before/exact/after current start, new start at/before now, interval order,
     Cancelled lock, DST gap/overlap, preserved identity, and persistence
     refusals;
   - Worker/D1 uses real Scheduled/Cancelled/past rows and retained Selections
     for atomic text/schedule writes, no reference rewrite, current actor/
     Course/time/state guards, stale old-schedule and cancellation races,
     rollback, and a Selection mutation accepted between old and new starts;
   - HTTP proves auth/production composition, same-Course identity, trust-field
     rejection, exact outcome/privacy mapping, stale re-resolution, and narrow
     representations;
   - Playwright uses a real future Module for descriptive/reschedule/DST/
     refresh flows and bounded server representations for in-progress, ended,
     Cancelled, and exact-start UI states that current public APIs cannot seed.

## Non-Goals / Out of Scope

- Module cancellation (`TASK-vwciv`) or deletion (`TASK-3zcmt`).
- Course archival (`TASK-fzniz`) or Archived-Course browser structure.
- Schedule change history, audit/revision rows, undo, recurrence, configurable
  booking deadlines, capacity, overlap conflict detection, or warnings.
- Updating/removing/restoring a Selection as a reschedule side effect.
- A migration, new browser route, dialog, test-only endpoint, package,
  dependency, first-level application module, boundary permission, or
  architecture checker.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Split descriptive and schedule operations | Product eligibility diverges: descriptions remain editable after start/cancellation while schedule does not. |
| Reuse the exact Course-local resolver | Creation and rescheduling have the same DST/definite-interval contract; two interpretations would drift. |
| Guard the expected old interval and captured current epoch in SQL | A stale reschedule cannot preserve earlier editability or overwrite a concurrent reschedule/cancellation. |
| Preserve the Module row without reading Selections | References attach to stable Module identity and automatically observe the new stored deadline. |
| Derive browser lock state server-side | The UI starts truthful without treating the browser wall clock as authority; the guarded write still owns races. |
| Keep stable Course detail | Module forms are owned interactions, not independently navigable product views. |

## Phases

### Phase 1: Domain Policy And Shared Schedule Resolution

- [x] Extract shared Module text and future-interval resolution used by create
      and reschedule without changing creation behavior.
- [x] Add descriptive-update and reschedule factories plus package exports.
- [x] Prove complete descriptive/temporal/DST matrices, identity retention,
      and exact persistence inputs/outcomes.

**Checkpoint**: Product policy clearly separates timeless descriptive edits
from a strictly pre-current-start definite schedule replacement.

### Phase 2: Guarded D1 And HTTP Acceptance

- [x] Add same-Course Module lookup plus atomic text and schedule capabilities.
- [x] Add item and schedule HTTP routes with current-time editability and
      narrow status/body mapping.
- [x] Prove real retained-reference preservation, shifted deadline, stale
      actor/Course/start/schedule/cancellation races, trust rejection, and
      rollback.

**Checkpoint**: Each accepted statement changes only its owned Module fields,
and any stale current-state loser changes nothing.

### Phase 3: Stable German Module Management

- [x] Add Module management cards with independent descriptive/schedule forms.
- [x] Add per-Module overlap controls, server-derived lock presentation, query
      reconciliation, and predictable field/result/error focus.
- [x] Add real and bounded Playwright temporal journeys with refresh,
      keyboard, desktop/360px, and axe coverage.

**Checkpoint**: Schedule lock never prevents valid content editing and every
visible success/refusal matches current authoritative Module state.

### Phase 4: Documentation, Verification, And Completion

- [x] Update canonical status, HTTP, persistence, package/module/browser/
      boundary, verification, dictionary, and index docs.
- [x] Run focused domain, Worker/D1, HTTP, and Playwright suites plus full
      `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-2u7z6`.

**Checkpoint**: Code, tests, docs, tracking, and history agree on the same
current-start schedule lock and timeless descriptive edit rule.

## Testing Strategy

- Booking-domain Vitest owns complete text fields, injected-time current/new
  start boundaries, interval ordering, Scheduled/Cancelled state, DST gap/
  overlap, identity retention, and persistence propagation.
- Worker/D1 Vitest owns guarded atomic updates, exact current-state
  classification, old-interval/cancellation/Course/actor races, rollback,
  retained Selection identity, and the shifted Selection deadline.
- Worker HTTP integration owns routes/methods, fresh authorization, same-Course
  lookups, body trust boundaries, current editability, exact status/body
  mapping, production composition, and technical sanitization.
- Playwright owns German independent forms, real descriptive/reschedule/DST
  flows, bounded exact/in-progress/ended/Cancelled presentation, refresh,
  responsive layout, keyboard/result focus, and axe scans.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced.
Already accepted Module text/schedule changes are ordinary product data and
are not automatically undone, matching the explicit absence of revision
history.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is focused on one Module editing/rescheduling task

## References

- `TASK-2u7z6`
- `docs/product/course-structure.md`
- `docs/product/module-participation.md`
- `docs/product/representative-scenarios.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`

## Implementation Evidence

- Shared Module text and future-interval helpers keep creation and
  rescheduling on one Course-local/DST interpretation; the two focused domain
  operations preserve identity and separate lifetime content from pre-start
  schedule eligibility.
- D1 and Worker HTTP evidence covers 19 persistence and 14 transport cases for
  atomic field ownership, retained references, shifted deadlines, current
  actor/Course/time/timezone/state checks, trust boundaries, rollback, privacy,
  and sanitized failures.
- Stable Admin Course detail now renders independent German Module content and
  schedule forms, unique DST occurrence controls/landmarks, authoritative
  locked states, predictable field/result/conflict focus, and Admin plus
  Participant cache reconciliation.
- Full `pnpm check` passed on 2026-08-29 with 315 domain, 250 Worker/D1, and 40
  Chromium tests plus lint, boundary enforcement, and production builds.
