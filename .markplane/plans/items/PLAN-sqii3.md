---
id: PLAN-sqii3
title: Implementation plan for Manage Participant Module Selections
status: done
implements:
- TASK-jvqrk
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Manage Participant Module Selections Implementation Plan

## Overview

Deliver Participant-owned Module Selection as the fourth booking responsibility
module and one complete vertical slice. The change adds the first Selection
schema, pure eligibility/history policy, guarded D1 mutation and private reads,
same-origin Participant HTTP operations, German MUI controls on the existing
Course detail route, layered tests, and implementation-state documentation.

The slice preserves Course Assignment as membership and Module Selection as
independent intent. It stores only the current Participant/Module/Group
relationship. Live, upcoming, in-progress, and historical meanings are derived
from current surrounding state plus the injected definite instant.

## Ground Truth

- `.markplane/backlog/items/TASK-jvqrk.md` — exact acceptance and evidence.
- `docs/product/module-participation.md` — Selection eligibility, mutation,
  temporal meaning, stale handling, and explicit exclusions.
- `docs/product/domain-model.md` — one-Selection, same-Course, identity, and
  derived-history invariants.
- `docs/architecture/module-organization.md` — responsibility-module and
  vertical-slice placement.
- `packages/booking/src/course-access/createGetParticipantCourse.js` — narrow
  operation-factory and plain-outcome pattern.
- `packages/booking/src/course-structure/createCreateModule.js` — injected
  clock and instruction-shaped domain workflow pattern.
- `apps/booking-system-web/src/worker/course-access/createParticipantCoursePersistence.js`
  — guarded private Course read and deterministic mapping pattern.
- `apps/booking-system-web/src/worker/course-access/createParticipantCourseHttpHandler.js`
  — fresh Participant authorization and private-unavailable HTTP pattern.
- `apps/booking-system-web/src/browser/course-access/ParticipantCourseStructure.jsx`
  — existing Participant Module presentation owner.
- `apps/booking-system-web/src/browser/course-access/useParticipantCourses.js`
  — slice-owned TanStack Query pattern.
- `apps/booking-system-web/migrations/0005_course_assignments.sql` — current
  restrictive relationship and permanent-ownership constraints.

## Approach

1. Add `packages/booking/src/module-participation/` with:
   - a pure current-state eligibility predicate;
   - a pure derived Selection-presentation function using a definite `now`;
   - set/change and remove operation factories that receive only narrow
     persistence capabilities and preserve language-neutral outcomes; and
   - focused Vitest plus an explicit public `index.js`.
2. Add migration `0006_module_selections.sql`:
   - add unique `(id, course_id)` parent keys required by SQLite composite
     references;
   - create `module_selections` with stable identity, Participant, Course,
     Module, and Group references;
   - enforce unique `(participant_id, module_id)` and composite same-Course
     Module/Group references; and
   - prevent ownership changes through restrictive foreign keys and triggers.
3. Add a Worker `module-participation` second-level slice:
   - guarded selection upsert and removal use one SQL statement per accepted
     mutation, rechecking Participant, Assignment, Course, Module, Group,
     ownership, lifecycle, and `startsAt` against injected `now`;
   - classification reads occur only after zero-change/refusal and never mutate;
   - Participant Course detail joins only the authenticated Participant's own
     Selection and selected Group; and
   - HTTP supports `PUT` and `DELETE` at the stable Participant
     Course/Module selection resource, with narrow privacy-preserving outcomes.
4. Extend the existing Participant Course browser slice:
   - keep selection controls on `/courses/:courseId` inside each Module card;
   - require an explicit Active Group radio choice; never preselect a default;
   - expose current choice, deadline, live/history meaning, pending/success,
     stale/unavailable, validation, and technical-error states;
   - use a MUI confirmation Dialog for removal with focus restoration; and
   - invalidate the stable Course-detail query after mutation.
5. Update explicit package boundaries for the new first-level booking module
   and update `docs/architecture/boundaries.md` in the same change.
6. Update current implementation truth in product/architecture/process status,
   focused architecture topic docs, and dictionary implementation wording.

## Non-Goals / Out of Scope

- Admin-assisted Selection is deferred to `TASK-2nh3b`.
- Assignment revocation retention is deferred to `TASK-smtvk`.
- Participant Disable retention is deferred to `TASK-25j4s`.
- Group archival, Module cancellation, and Course archival effects remain in
  `TASK-kmm36`, `TASK-vwciv`, and `TASK-fzniz`.
- No capacity, default Group, conflict detection, attendance, notification,
  configurable deadline, or removed-choice audit history is introduced.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Introduce `module-participation` now | This is the first implemented behavior owned by the accepted responsibility module. |
| Store `course_id` on Selection | Composite foreign keys can mechanically enforce that Module and Group belong to the same Course. |
| One guarded SQL statement per set/remove | Authoritative state and deadline checks decide the mutation without a partial prior write. |
| Keep one current row and no change log | The product defines absence as non-participation and explicitly excludes retained pre-start replacements/removals. |
| Derive meaning on reads | Live/history is a function of current Participant, Assignment, Course, Module, and time, not a Selection lifecycle. |
| Keep controls on Participant Course detail | The Module choice is owned by the already stable refresh-safe Course route, not an independently navigable view. |

## Phases

### Phase 1: Domain Policy And Schema

- [x] Add Selection eligibility, set/remove, and derived-meaning operations.
- [x] Add focused Vitest for exact start/end, same-Course, idempotence,
      replacement/removal, stale refusal, overlap allowance, and public exports.
- [x] Add migration and migration tests for clean/upgrade paths, uniqueness,
      same-Course constraints, permanent ownership, and restrictive deletion.

**Checkpoint**: The domain and schema can represent only zero/one valid current
Selection and no stored Selection status.

### Phase 2: Worker And HTTP

- [x] Add narrow Selection persistence with atomic guarded upsert/delete.
- [x] Extend Participant Course reads with the current own Selection and
      selected Group while preserving identifier privacy.
- [x] Add `PUT`/`DELETE` resource handling with fresh session, Participant,
      Assignment, Course, Module, Group, and deadline resolution.
- [x] Cover concurrency, current-state losses, unchanged prior values,
      constraints, exact HTTP outcomes, and sanitized technical errors.

**Checkpoint**: Direct requests can choose, reselect, replace, remove, refresh,
and refuse stale operations without duplicates or partial side effects.

### Phase 3: Browser Experience

- [x] Add slice-owned mutation hooks and query invalidation.
- [x] Add explicit Group controls, current/deadline/meaning presentation,
      removal Dialog, German translations, and predictable result/error focus.
- [x] Add Playwright coverage for choose/reselect/change/remove, overlap,
      refresh, stale Assignment/deadline refusal, desktop/360px, keyboard,
      Dialog focus restoration, privacy, and axe scans.

**Checkpoint**: The real Participant journey satisfies all UI/UX acceptance
surfaces without exposing another Participant's data.

### Phase 4: Documentation, Verification, And Completion

- [x] Update boundary map plus canonical architecture counterpart.
- [x] Update implementation-state docs and dictionary coverage without
      changing already accepted product behavior.
- [x] Run focused tests, then full `pnpm check`.
- [x] Mark the task done, run `markplane sync` and `markplane check`, and
      commit one semantic conceptual change ending in `TASK-jvqrk`.

**Checkpoint**: Every required evidence layer passes and repository truth,
planning state, and commit history agree.

## Execution State

- Current phase/checkpoint: Phases 1-4 are complete; Markplane closure and the
  semantic implementation commit remain.
- Completed phase checkboxes: all Phase 1-4 items.
- Next exact action: mark task and plan done, sync/check Markplane, review and
  stage the task diff, create the semantic commit, and verify clean Git.
- Persisted decisions: accepted product behavior remains in canonical product
  docs; the sixth migration, HTTP resource, authoritative availability,
  browser interaction, boundary map, and implementation status are recorded in
  their owning architecture/process/dictionary docs.
- Focused verification: lint passes; 184 booking-domain and 118 Worker/D1 tests
  pass; the affected four Chromium scenarios pass together. The final
  canonical `pnpm check` passes on 2026-08-28 with 9 repository-rule tests, 13
  boundary tests, both production builds, and all 25 Chromium scenarios.
- Remaining verification: semantic task commit and clean Git.

## Testing Strategy

- Domain Vitest owns pure eligibility, current-row semantics, exact temporal
  predicates, same-Course policy, overlaps, and derived meaning.
- Worker/D1 Vitest owns migration paths, constraints, guarded atomic mutations,
  concurrency/stale outcomes, private reads, and response contracts.
- Playwright owns the composed German Participant journey, direct refresh,
  keyboard/focus/Dialog behavior, desktop/mobile layout, privacy, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the task commit before deployment. Migration `0006` is additive and no
remote database exists; local/test state is disposable and reconstructed from
the version-controlled sequence. Do not add a destructive down migration.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `TASK-jvqrk`
- `docs/product/module-participation.md`
- `docs/process/verification.md`
- `docs/architecture/persistence.md`
- `docs/architecture/module-organization.md`
