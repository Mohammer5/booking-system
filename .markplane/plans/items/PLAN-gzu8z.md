---
id: PLAN-gzu8z
title: Implementation plan for Revoke and reactivate Course Assignments
status: done
implements:
- TASK-smtvk
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Course Assignment Lifecycle Implementation Plan

## Overview

Complete the existing `course-access` membership slice by retaining one stable
Course Assignment and adding its Active/Revoked transitions. Direct Assignment
will create, repeat, or reactivate the same row for an Active Course. A separate
Admin revocation operation will allow Active or Archived Courses and atomically
remove only future Scheduled-Module Selections before changing the Assignment
to Revoked.

No migration or new responsibility module is needed. The existing Assignment
state constraint, one Participant/Course pair, Module/Selection ownership, and
injected application clock already represent the accepted behavior.

## Ground Truth

- `.markplane/backlog/items/TASK-smtvk.md` — exact lifecycle, UI, evidence,
  ordering, and non-goal boundaries.
- `docs/product/course-access.md#administrative-assignment` and
  `#assignment-revocation-and-reactivation` — retained-row transitions,
  Archived-Course rules, and immediate access effects.
- `docs/product/module-participation.md#course-assignment-revocation` and
  `#assignment-reactivation-in-progress` — exact Selection removal/retention
  and derived live/history rules.
- `packages/booking/src/course-access/createAssignParticipantToCourse.js` —
  current direct-Assignment actor/target operation and narrow outcomes.
- `packages/booking/src/module-participation/deriveModuleSelectionPresentation.js`
  — current authoritative live/history derivation.
- `apps/booking-system-web/src/worker/course-access/createCourseAssignmentPersistence.js`
  — current guarded insert, retained-row classification, and ordered list.
- `apps/booking-system-web/src/worker/course-access/createCourseAccessHttpHandler.js`
  — current fresh Admin authorization and membership collection HTTP.
- `apps/booking-system-web/src/browser/course-access/CourseMembershipSection.jsx`
  and `CourseAssignmentDialog.jsx` — existing state labels, responsive cards,
  direct-Assignment dialog, and focus ownership.
- `apps/booking-system-web/migrations/0005_course_assignments.sql` and
  `0006_module_selections.sql` — stable state/pair/ownership constraints; no
  schema change is required.

No relevant adjacent `*.docs.md` file exists for the concrete source files.

## Approach

1. Extend booking-domain membership operations:
   - make `createAssignParticipantToCourse` preserve `reactivated` as a normal
     successful outcome while retaining existing create/repeat/refusal rules;
   - add `createRevokeCourseAssignment`, requiring an Active Admin, matching
     Active/Archived Course, and matching Active/Revoked Assignment;
   - inject `now()` once and pass its exact epoch to authoritative persistence;
     already-Revoked remains an idempotent no-op; and
   - retain existing Selection live/history derivation, proving that a retained
     in-progress Selection becomes live only after eligible reactivation.
2. Extend the existing D1 Assignment adapter without a migration:
   - guarded insert uses its pair conflict to change a retained Revoked row to
     Active in an Active Course, preserving Assignment identity;
   - distinguish `created`, `reactivated`, and `already-active` from the stable
     row and never recreate removed Selections;
   - revocation runs an atomic ordered `D1Database.batch()`: first delete this
     Assignment's Selections joined to Scheduled Modules with
     `starts_at > now`, then update the same still-Active Assignment to Revoked;
   - both statements repeat identical current Active-Admin, matching Course,
     and Active-Assignment guards so an idempotent/stale loser changes nothing;
   - retain exact-start, begun Scheduled, and every Cancelled-Module Selection;
     restrict every effect to the Assignment's Participant/Course pair; and
   - classify current state only after zero change, returning the retained row
     and removed-selection count without introducing lifecycle history.
3. Extend concrete same-origin HTTP:
   - keep `POST /api/admin/courses/:courseId/assignments` for create,
     already-Active, and reactivation by server-resolved Participant identity;
   - make its mutation result explicit as `{ outcome, assignment }`, with `201`
     for create and `200` for repeat/reactivation;
   - add idempotent `POST
     /api/admin/courses/:courseId/assignments/:assignmentId/revocation`, with no
     browser-selected state and a narrow outcome/count representation; and
   - freshly authorize every request, hide unknown/mismatched Assignment data
     behind `404`, use exact `409` current-state refusals, and sanitize `500`.
4. Extend the existing Admin Course membership UI:
   - keep Active/Revoked and Participant-state chips on stable Course detail;
   - Active membership offers a revocation confirmation in Active or Archived
     Courses; Revoked membership offers reactivation only for Active Courses;
   - revocation copy explains access loss and future-Selection removal, while
     reactivation explicitly does not promise Selection restoration;
   - direct Assignment dialog handles Revoked choices as reactivation and
     reports create/repeat/reactivation distinctly; and
   - mutations invalidate the Course membership collection and applicable
     Participant Course list/detail caches, with predictable dialog/result/
     refusal focus and responsive German MUI presentation.
5. Preserve task boundaries:
   - do not expose Admin Selection inspection; TASK-49if4 owns that read model;
   - do not add Invite Join, Course archival controls, Participant lifecycle,
     or Admin-assisted Selection behavior; and
   - update canonical implementation, HTTP, persistence, browser, verification,
     status, dictionary, and index docs without changing product truth.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse the Assignment row and schema | State and unique pair already encode the complete retained lifecycle. |
| Collection POST performs reactivation | Product defines direct assignment/reactivation as one membership operation. |
| Explicit revocation action resource | Revocation retains the Assignment, so HTTP `DELETE` would misstate the effect; browser input also does not select lifecycle state. |
| Delete then update in one guarded D1 batch | Both effects share one transaction and identical pre-state guards; repeat/stale losers delete nothing. |
| Keep Admin Selection inspection deferred | TASK-49if4 explicitly owns composed retained participation views. |

## Phases

### Phase 1: Domain And Atomic Persistence

- [x] Add reactivation and revocation domain outcomes with injected-time,
      ownership, idempotence, Archived, independence, and live/history evidence.
- [x] Extend guarded Assignment upsert to reuse Revoked rows in Active Courses.
- [x] Add guarded atomic revocation with exact Scheduled boundary, Cancelled
      retention, counts, concurrency, multi-Course isolation, and rollback.

**Checkpoint**: One stable row transitions coherently and no refused/repeated
operation changes membership or Selection state.

### Phase 2: HTTP And Fresh Access

- [x] Add dynamic revocation matching and explicit mutation representations.
- [x] Cover fresh Active/Disabled Admin outcomes, missing/mismatched targets,
      Active/Archived rules, repeat/concurrency, technical sanitization, and
      production composition.
- [x] Prove Participant list/detail access disappears after revocation and
      returns only after eligible reactivation, without cross-Course leakage.

**Checkpoint**: Direct requests expose only authorized narrow membership data
and fresh Assignment state controls every Participant access.

### Phase 3: German Membership Lifecycle UI

- [x] Add slice-owned revoke/reactivate mutations and targeted invalidation.
- [x] Add per-card permitted actions, confirmation dialog, accurate warning/
      success/refusal copy, and keyboard/focus/mobile behavior.
- [x] Add Playwright real create/select/revoke/repeat/reactivate/access and
      multi-Course isolation; use bounded route interception only for Archived
      and retained-in-progress presentation that preceding lifecycle UIs cannot
      yet create, plus desktop/360px and axe evidence.

**Checkpoint**: Stable Course detail safely administers every currently
permitted Assignment transition without implying Selection restoration.

### Phase 4: Documentation, Verification, And Completion

- [x] Update affected canonical docs, dictionary coverage, and index routing.
- [x] Run focused suites and the final canonical `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and create one semantic commit
      ending in `TASK-smtvk`.

**Checkpoint**: Product behavior, implementation truth, evidence, tracking,
and commit history agree.

## Execution State

All phases completed on 2026-08-28. The canonical `pnpm check` gate passes with
214 booking-domain tests, 146 Worker/D1 tests, a successful production build,
and 30 Chromium Playwright tests.

## Testing Strategy

- Booking-domain Vitest owns actor/Course/Assignment eligibility, exact injected
  instant, idempotence, reactivation outcome, independence, and retained
  Selection live/history predicates.
- Worker/D1 Vitest owns batch atomicity/rollback, exact boundary and lifecycle
  filtering, unique/concurrent row reuse, fresh guards, HTTP privacy, and access.
- Playwright owns composed German actions, confirmations, result/error focus,
  refresh, real access loss/restoration, future non-restoration, multi-Course
  isolation, bounded later-lifecycle states, responsiveness, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. There is no migration or remote state; the existing
Active/Revoked schema remains valid and local/test D1 state is disposable.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derive from current source/contracts
- [x] Plan stays focused on this one lifecycle task

## References

- `TASK-smtvk`
- `docs/product/course-access.md`
- `docs/product/module-participation.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/process/verification.md`
