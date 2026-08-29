---
id: PLAN-pchnp
title: Implement administrative participation inspection
status: done
implements:
- TASK-49if4
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Administrative Participation Inspection Implementation Plan

## Overview

Add an Admin-only, read-only Course participation model and responsive German
browser views. One guarded D1 batch composes the Course, every retained
Assignment and Participant, Modules, Groups, and retained Selections. The
Worker derives each Selection's live/historical meaning with the existing
booking-domain predicate and one injected `now`; no status is stored or read
from transport input.

The browser provides a Course-scoped overview at a stable route and a
refresh-safe Participant detail route. The overview uses a semantic table on
wide screens and cards on narrow screens, and exposes all Module and Group
lifecycle states. The detail view presents each Module and the selected Group,
including retained Archived Group details. Participant-facing Course reads and
contracts remain byte-for-byte unchanged.

## Ground Truth

- `.markplane/backlog/items/TASK-49if4.md` — complete read-side scope,
  derived lifecycle requirements, Admin authorization, privacy, German UI,
  and verification evidence.
- `.instructions/instructions-00015.md` — task order and authority to complete
  `TASK-49if4` before assisted mutations in `TASK-2nh3b`.
- `docs/product/course-access.md#admin-user-visibility` — Admin Course,
  Participant, Assignment, Module, Group, and Selection visibility; explicit
  Participant privacy boundary.
- `docs/product/module-participation.md#exact-live-and-historical-meaning` and
  `#lifecycle-effects-on-selections` — complete derived Selection predicate,
  exact `endsAt`, retained history, and valid return to live meaning.
- `docs/product/course-structure.md#active-and-archived-lifecycle` — Active
  and Archived Course inspection and structure lifecycle.
- `docs/product/representative-scenarios.md#w-live-and-historical-selection-transitions`
  — exact future, in-progress, ended, cancelled, Disabled, Revoked, Archived,
  and reactivated examples.
- `docs/product/non-goals.md#adjacent-product-concerns` — no attendance,
  audit, report, Participant roster, or Participant-visible Group counts.
- `docs/process/verification.md` — required domain, D1/Worker, browser,
  privacy, responsive, keyboard/focus, and axe verification layers.
- `packages/booking/src/module-participation/deriveModuleSelectionPresentation.js`
  — existing dependency-free, injected-time live/historical derivation.
- `packages/booking/src/module-participation/moduleParticipation.test.js` —
  existing exact lifecycle matrix to extend with Archived Group retention.
- `apps/booking-system-web/src/worker/course-access/createParticipantCoursePersistence.js`,
  `createParticipantCourseHttpHandler.js`, and
  `participantCourseHttpContract.js` — private Participant read model and
  narrow response contract that must not change.
- `apps/booking-system-web/src/worker/course-access/createCourseAccessHttpHandler.js`
  and `createCourseAssignmentPersistence.js` — fresh Admin resolution,
  exact route, D1 mapping, and refusal conventions.
- `apps/booking-system-web/src/browser/course-access/CourseMembershipSection.jsx`,
  `ParticipantDirectoryPage.jsx`, and `useCourseAccess.js` — loading/empty/
  unavailable presentation, deterministic membership order, and query style.
- `apps/booking-system-web/src/browser/course-structure/CourseDetailPage.jsx`
  and `apps/booking-system-web/src/browser/BrowserApplication.jsx` — stable
  Course context and nested Admin route composition.
- `apps/booking-system-web/migrations/0002_courses.sql` through
  `0006_module_selections.sql` — current lifecycle states, uniqueness, and
  cross-Course ownership constraints.
- `docs/architecture/boundaries.md` and both `boundaries.config.mjs` files —
  the work remains inside existing booking `module-participation` and
  application Worker/browser responsibilities without a boundary-map change.

No adjacent `*.docs.md` exists in the affected domain, Worker, browser,
composition, or browser-test source trees.

## Approach

1. Preserve and prove the booking-domain policy:
   - extend the existing derivation tests across every named lifecycle edge;
   - prove an Archived selected Group remains embedded unchanged in an
     in-progress or historical Selection presentation; and
   - continue accepting one ISO `now` input with no stored Selection status.
2. Add a focused Worker `administrative-participation` read capability under
   the existing `course-access` slice:
   - `findCourseParticipation(adminUserId, courseId)` executes a D1 batch for
     Course, all Course Assignments with Participant data, all Modules, all
     Groups, and all retained Selection/selected-Group rows;
   - every statement rechecks the same Active Admin ID and scopes every joined
     Participant, Module, Group, and Selection to the requested Course;
   - a stale Admin produces no Course and therefore no response data; and
   - row mapping returns normalized domain-shaped data with Module epochs
     converted to ISO instants.
3. Add exact `GET /api/admin/courses/:courseId/participation` handling:
   - authenticate and freshly resolve one Active Admin before reading;
   - call the guarded persistence with the resolved Admin ID;
   - return one normalized model containing `course`, `groups`, `modules`, and
     `participations` (`participant`, `assignment`, `selections`);
   - derive every returned Selection with the matching authoritative
     Participant, Assignment, Course, Module, and one captured `now`; and
   - return no data for missing Course or stale/Disabled/missing Admin state.
4. Compose/export the new persistence and handler through production and
   non-production Workers. Route only the exact participation path to this
   handler before generic Course structure dispatch. No dependency or boundary
   map changes are needed.
5. Add Admin browser reads and stable routes:
   - `/admin/courses/:courseId/participation` shows Course context, all Groups,
     all Modules, and responsive Assignment/Participant overview;
   - `/admin/courses/:courseId/participation/:participantId` resolves only a
     Participant present in the authorized Course response and shows each
     Module with no/live/historical Selection and selected Group details;
   - link the Course detail to participation inspection and preserve safe back
     navigation to the Course and overview;
   - use text plus Chip styling for every Course, Assignment, Participant,
     Module, Group, live/historical, and upcoming/in-progress state; and
   - preserve visible keyboard focus, focus errors, and keep loading, empty, unavailable, and
     technical failures within the current Course context.
6. Add layered evidence and update canonical docs/tracking. Review dictionary
   coverage and update only if this implementation introduces a new stable
   repository term.

## Non-Goals / Out of Scope

- Admin-assisted set/change/remove Selection or atomic Assignment composition;
  those mutations remain exclusively in `TASK-2nh3b`.
- Participant creation, Participant/Assignment lifecycle commands, or changes
  to existing Admin Course structure mutations.
- Participant-visible roster, peer profile/email/Selection, Group count,
  Admin information, public Course discovery, or widening the existing
  Participant HTTP contract.
- Attendance proof, capacity/conflict/approval rules, audit history,
  notifications, exports, reports, or analytics.
- A stored Selection status, new schema/migration, shared generic read-model
  framework, dependency, package, first-level module, boundary permission, or
  architecture checker.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Separate Admin-only HTTP contract | Privacy is structural: no roster or peer data enters the Participant route or mapper. |
| Normalized Course response | Modules and Groups are returned once; Participant detail can join retained Selections without duplicating Course structure. |
| Guard every D1 batch statement with Admin ID | Initial authentication is insufficient if the actor becomes Disabled before the read executes. |
| Derive status in the Worker with existing domain policy | One injected `now` and authoritative lifecycle rows prevent stored or client-trusted status drift. |
| Overview plus Participant detail routes | Direct refresh and responsive list/table/detail needs are met without adding a Module mutation route ahead of `TASK-2nh3b`. |
| Keep archived selected Group embedded in Selection | Historical meaning survives Group archival while all Groups remain independently inspectable. |
| Leave Participant files unchanged | The strongest evidence for privacy is no production change to its persistence, handler, or contract. |

## Phases

### Phase 1: Domain And Guarded Read Model

- [x] Extend domain lifecycle/Archived Group derivation evidence.
- [x] Implement the Active-Admin-guarded normalized D1 read and prove Course,
      Participant, Assignment, Module, Group, Selection, and selected-Group
      composition across lifecycle states.

**Checkpoint**: One read returns only requested-Course rows while stale Admin
state returns no data and no Selection status exists in persistence.

### Phase 2: Admin HTTP Contract And Privacy

- [x] Add exact read-only route, fresh Admin resolution, one-time `now`, narrow
      response mapping, and unavailable/technical outcomes.
- [x] Compose the handler/persistence and prove Active/Archived inspection,
      exact lifecycle presentations, stale authorization, cross-Course
      isolation, method/path rejection, and unchanged Participant responses.

**Checkpoint**: Only an Active current Admin receives the complete Admin model;
Participant APIs still expose only the participant's own existing shape.

### Phase 3: German Responsive Inspection Views

- [x] Add overview/detail queries, routes, Course navigation, responsive
      table/cards, complete structure/detail rendering, and German copy.
- [x] Cover direct refresh, empty/unavailable/technical states, desktop and
      360px layouts, keyboard/focus, non-color-only meaning, privacy probes,
      overflow, and axe scans with real Worker-backed Playwright journeys.

**Checkpoint**: Active Admins can inspect every required state accessibly from
stable Course URLs without any mutation affordance.

### Phase 4: Documentation And Completion

- [x] Update canonical product/architecture/status/verification docs and
      indexes; confirm dictionary and co-located documentation coverage.
- [x] Run focused tests and builds, then one uninterrupted final `pnpm check`.
- [x] Complete task/plan checklists, sync/check Markplane, inspect the diff,
      and create one semantic commit ending in `(TASK-49if4)`.

**Checkpoint**: Product truth, implementation, evidence, tracking, and Git all
agree before work begins on `TASK-2nh3b`.

## Testing Strategy

- Booking-domain Vitest: exact before/start/in-progress/`endsAt`, Cancelled,
  Disabled, Revoked, Archived Course, reactivated/re-enabled live return,
  mismatched ownership, invalid `now`, and retained Archived Group identity.
- Worker/D1 Vitest: normalized ordering and mapping, zero-data Course,
  Active/Archived Course, Active/Revoked Assignment, Active/Disabled
  Participant, Scheduled/Cancelled Module, Active/Archived Group, retained
  selections, cross-Course isolation, and stale Active-to-Disabled Admin.
- Worker HTTP Vitest: exact route/method, fresh Active Admin, missing/Disabled/
  stale Admin, missing Course, one captured `now`, complete lifecycle matrix,
  narrow response, and Participant contract/privacy regression probes.
- Playwright: overview/detail, future/in-progress/ended/Cancelled/Disabled/
  Revoked/Archived presentations, Archived Group details, Active and Archived
  Courses, empty model, direct refresh, stale/unavailable and technical
  failures, Participant privacy probes, wide/narrow rendering, keyboard/focus,
  overflow, and axe.
- Full `pnpm check` as the final uninterrupted acceptance command.

## Rollback Plan

Revert the one task commit. The feature is additive and read-only: no migration
or accepted product state must be undone. Existing Course administration and
Participant routes remain independently functional if the new Admin route,
composition capability, and navigation link are removed together.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `TASK-49if4`
- `TASK-2nh3b`
- `docs/product/course-access.md`
- `docs/product/module-participation.md`
- `docs/product/representative-scenarios.md`
- `docs/process/verification.md`
