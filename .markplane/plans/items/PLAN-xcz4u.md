---
id: PLAN-xcz4u
title: Implementation plan for Archive Courses with read-only historical access
status: done
implements:
- TASK-fzniz
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Course Archival And Read-Only Historical Access Implementation Plan

## Overview

Complete the terminal `Active -> Archived` Course transition without adding a
new lifecycle state or rewriting retained data. An Active Admin may archive an
Active Course only when every Scheduled Module has reached exact `endsAt` or
later; a Cancelled Module never blocks. One injected definite instant and one
guarded D1 update will decide the transition authoritatively.

The existing schema and write guards already make Archived Courses
structurally read-only. This change will expose the missing archive operation,
prove every implemented structural/membership/Selection write loses to current
Archived state, and extend Participant Course reads from Active-only to Active-
or-Archived access for an Active Participant with an Active Assignment.
Retained Selections then become historical through existing derived meaning.

Admin Course index/detail will distinguish Archived state, expose a focused
German permanent-archive Dialog only for Active Courses, and render Archived
detail with only Assignment revocation still actionable. Participant list and
detail will retain private, directly navigable historical access and present
all booking controls as read-only until revocation removes access.

## Ground Truth

- `.markplane/backlog/items/TASK-fzniz.md` — complete boundary/time matrix,
  no-rewrite rule, read-only surfaces, privacy, concurrency, and evidence.
- `docs/product/course-structure.md#course-lifecycle` — terminal lifecycle,
  exact archival precondition, frozen structure, and sole revocation exception.
- `docs/product/course-access.md#archived-course` — Active-Assignment historical
  access, post-archive revocation, reactivation refusal, and privacy.
- `docs/product/module-participation.md#module-cancellation-and-course-archival`
  — retained Selection rows become historical from surrounding Course state.
- `docs/product/domain-model.md#time-and-lifecycle` — hard lifecycle,
  membership, Selection, and authoritative-acceptance invariants.
- `packages/booking/src/course-structure/createCancelModule.js` — one injected
  instant, strict boundary, guarded persistence, and narrow result pattern.
- `packages/booking/src/course-access/hasParticipantCourseAccess.js` and
  `createRevokeCourseAssignment.js` — shared access predicate and existing
  Active/Archived revocation policy.
- `packages/booking/src/module-participation/getModuleSelectionRefusal.js` and
  `deriveModuleSelectionPresentation.js` — Archived mutation refusal and
  derived historical meaning already owned by Module participation.
- `apps/booking-system-web/migrations/0002_courses.sql` — constrained
  Active/Archived Course state; no migration is needed.
- `apps/booking-system-web/src/worker/course-structure/createCoursePersistence.js`
  and `createCourseHttpHandler.js` — current Course read/write composition,
  guarded stale resolution, and stable resource routing.
- `apps/booking-system-web/src/worker/course-access/createCourseAssignmentPersistence.js`
  — addition/reactivation requires Active while revocation permits Archived.
- `apps/booking-system-web/src/worker/course-access/createParticipantCoursePersistence.js`
  — current Active-only Participant membership/structure read boundary.
- `apps/booking-system-web/src/browser/course-structure/CourseDetailPage.jsx`
  and `CourseIndexPage.jsx` — stable Admin lifecycle presentation ownership.
- `apps/booking-system-web/src/browser/course-access/ParticipantCourseDetailPage.jsx`
  and `CourseMembershipSection.jsx` — Participant history and permitted
  Assignment action surfaces.
- `docs/architecture/applications.md`, `persistence.md`,
  `browser-conventions.md`, and `docs/process/verification.md` — HTTP,
  atomicity, accessible MUI, and layered verification contracts.

No relevant adjacent `*.docs.md` exists for the inspected source,
configuration, migration, or test files.

## Approach

1. Add `createArchiveCourse` to booking `course-structure`:
   - require Active Admin, Active Course, and a complete same-Course Module
     context containing only Scheduled or Cancelled rows;
   - capture `now` once and block when any Scheduled Module has
     `Date.parse(endsAt) > now`, including upcoming/in-progress but excluding
     exact end and every Cancelled interval;
   - call persistence with only Admin/Course identities and accepted epoch;
   - return the same Course with only state changed to `archived`; and
   - compose existing domain predicates in tests to prove assignment creation,
     Selection mutation, and live meaning close while revocation/read access
     remain permitted.
2. Add guarded persistence without a migration:
   - atomically update one Active Course to Archived only for a current Active
     Admin and when no Scheduled same-Course Module has `ends_at > now`;
   - classify stale Admin, missing/already-Archived Course, temporal blocker,
     and unexplained/technical loss without changing any related row;
   - prove Course fields/history, Groups, Modules, Assignments, and Selections
     remain byte-for-byte stable apart from Course state;
   - race archival against Module create/cancel/edit/delete, Course/Group edits,
     Assignment addition/reactivation, and Selection writes so one current-state
     outcome wins without mixed effects; and
   - expand Participant membership/detail queries to Active or Archived Course
     while retaining Active Participant/Assignment guards, own-Selection-only
     projection, and current Active-Group plus selected-Group privacy.
3. Add a body-free Course lifecycle action:
   - `POST /api/admin/courses/:courseId/archival`;
   - derive Admin, Course, Modules, availability, and current instant on the
     server, accepting no lifecycle/time/structure trust fields;
   - return `200 { outcome: "archived", course }`, exact actor/404 responses,
     `409 course-archival-blocked` or terminal/stale outcomes, and sanitized
     `500 technical-error`;
   - derive detail-only `isArchivalAvailable` from the response instant and
     current Modules while the guarded update remains authoritative; and
   - preserve existing Active-only guards on every write plus Archived-capable
     Admin list/detail/Assignment-list/revocation reads.
4. Add the German read-only experience:
   - show Active/Archived state in Admin and Participant lists/details;
   - use a MUI archival Dialog naming the Course, permanence, retained history,
     and read-only consequence; focus Cancel first, focus blocker/stale/error,
     restore on dismissal, and focus parent success after transition;
   - present known Module blockers without private participation data;
   - on Archived Admin detail remove Course/Group/Module create/edit/lifecycle/
     delete and Assignment add/reactivate controls while retaining structure,
     membership inspection, and Active-Assignment revocation;
   - on Archived Participant detail show a non-color-only historical/read-only
     status, all own retained Selections as historical, and no mutation controls;
     and
   - invalidate Admin index/detail, Participant list/detail, and membership
     queries after archival or post-archive revocation.
5. Verify and document the complete boundary:
   - domain tests cover upcoming/in-progress/exact-end/ended/Cancelled/mixed
     blockers, terminal state, access, mutation freeze, and derived history;
   - D1/HTTP tests cover no rewrite, all implemented write guards, stale races,
     privacy, post-archive revocation, reactivation refusal, production
     composition, and sanitization;
   - Playwright covers blocked then allowed archival, Archived Admin action
     inventory, Participant read-only own history, later revocation/privacy,
     direct refresh, keyboard/Dialog/result focus, desktop/360px, and axe; and
   - update canonical status, application/HTTP, persistence, package/module/
     browser/boundary, verification, dictionary, and routing docs.

## Non-Goals / Out of Scope

- Course hard deletion, reactivation, restore, automatic Module cancellation,
  archive reason, audit/revision log, notifications, or retention/backup policy.
- Implementing Course Invite management/Join (`TASK-k2ckf`, `TASK-5gny6`) or
  Admin-assisted Selections (`TASK-49if4`, `TASK-2nh3b`). Those later paths
  must consume this Course state and retain the accepted Active-only guards.
- A migration, new Course detail route, test-only endpoint, dependency,
  package, first-level responsibility, boundary permission, or architecture
  checker.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| One guarded Course-state update | Blocker evaluation and terminal transition remain atomic. |
| Strict `ends_at > now` blocker | Upcoming/in-progress block; exact end and Cancelled do not. |
| Existing Course archival subresource | Lifecycle intent is body-free and distinct from field replacement. |
| Derived history, no Selection rewrite | Course state already determines live versus historical meaning. |
| Expand reads, retain write guards | Archived access changes visibility, not mutation eligibility. |
| Conditional stable detail surfaces | The same direct routes preserve inspection while exposing only permitted actions. |

## Phases

### Phase 1: Domain Transition And Atomic Persistence

- [x] Add the archive factory, exports, exact instant/state matrix, and
      cross-responsibility read-only/history assertions.
- [x] Add one guarded D1 transition and exact refusal classification.
- [x] Prove full no-rewrite behavior, stale/technical safety, and structural/
      booking race outcomes without a migration.

**Checkpoint**: Only eligible Course state changes to Archived; every retained
row and value remains unchanged and every later write sees current state.

### Phase 2: HTTP And Historical Authorization

- [x] Add archival route/composition, narrow responses, derived availability,
      and current-state sanitization.
- [x] Extend Participant list/detail D1 and domain access to Active or Archived
      Courses while retaining Active Participant/Assignment privacy guards.
- [x] Prove Admin inspection, Participant own-history reads, revocation access
      removal, reactivation refusal, and unchanged write endpoints.

**Checkpoint**: Archived Course reads remain private and direct; mutation is
closed except for authoritative Assignment revocation.

### Phase 3: German Archived-Course Presentation

- [x] Add focused archival control/Dialog/result and lifecycle state labels.
- [x] Make Admin detail structurally read-only with only revocation actionable.
- [x] Make Participant detail explicitly historical/read-only and add complete
      real/bounded browser journeys with refresh, responsive, keyboard, focus,
      privacy, and axe evidence.

**Checkpoint**: Both audiences distinguish Archived state without discovering
or invoking a prohibited action.

### Phase 4: Documentation, Verification, And Completion

- [x] Update canonical global docs, dictionary, and indexes with implemented
      archival/read-only behavior and deferred Invite integration.
- [x] Run focused suites and one uninterrupted full `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-fzniz`.

**Checkpoint**: Product, code, evidence, docs, tracking, and history agree on
terminal no-rewrite Course archival and private read-only historical access.

## Testing Strategy

- Booking-domain Vitest owns lifecycle/time boundaries, structural freeze via
  existing operation predicates, archived access, revocation exception, and
  derived Selection history.
- Worker/D1 owns the guarded transition, no-rewrite snapshot, all current write
  guards/races, archived Participant reads/privacy, revocation, rollback, and
  no migration.
- Worker HTTP owns body-free routing, current availability, exact outcomes,
  production authentication, direct Admin/Participant reads, and sanitization.
- Playwright owns German confirmation/blocker/read-only states, complete action
  inventory, Participant own history then revocation, refresh, desktop/360px,
  keyboard/Dialog/result focus, overflow, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced. A
Course already Archived while the feature is in use remains terminal product
data and cannot be automatically restored, matching the explicit lifecycle.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is focused on one Course archival task

## References

- `TASK-fzniz`
- `docs/product/course-structure.md`
- `docs/product/course-access.md`
- `docs/product/module-participation.md`
- `docs/product/domain-model.md`
- `docs/product/representative-scenarios.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`
