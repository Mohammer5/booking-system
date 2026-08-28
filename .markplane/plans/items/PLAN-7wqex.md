---
id: PLAN-7wqex
title: Implementation plan for Edit Courses and govern timezone changes
status: done
implements:
- TASK-7n2my
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Course Edit And Permanent Timezone Lock Implementation Plan

## Overview

Add Active-Course field editing to the existing `course-structure`
responsibility. Name and optional description remain editable for the lifetime
of an Active Course. A different valid IANA/TZDB timezone is accepted only
while the existing permanent `has_ever_had_module` fact is false.

The persistence boundary will make a timezone edit and first Module creation a
two-sided guarded race. If Module insertion wins, its existing trigger freezes
the Course before the edit can change any field. If the Course edit wins, a
Module request whose local times were resolved through the earlier timezone is
refused rather than persisting definite instants under a changed Course
timezone.

The stable Admin Course detail will add a German MUI edit section. It presents
a real timezone field only while the server-derived editability predicate is
true. Once locked, it presents the current timezone and a permanent-lock
explanation instead of a disabled control that could imply later availability.

No migration, new route, first-level module, dependency, or boundary-map change
is needed. The existing Course row, permanent history column and trigger,
stable detail route, form/query libraries, and `course-structure` slices own
the complete change.

## Ground Truth

- `.markplane/backlog/items/TASK-7n2my.md` — exact field, timezone-lock,
  concurrency, UI, evidence, and non-goal boundaries.
- `docs/product/course-structure.md#course-structure` and `#course-timezone` —
  editable fields, valid named timezones, permanent first-Module freeze, and
  prohibition on reinterpretation or rescheduling.
- `docs/product/domain-model.md#time-and-lifecycle` — hard invariant that an
  Active Course with no current Modules may still be permanently locked.
- `docs/product/representative-scenarios.md#n-course-timezone-and-dst` — first-
  Module and later-deletion behavior.
- `packages/booking/src/course-structure/createCreateCourse.js` — existing
  Course field validation and named-timezone policy.
- `packages/booking/src/course-structure/createCreateModule.js` — existing
  Course-timezone local-to-definite resolution before persistence.
- `apps/booking-system-web/migrations/0003_groups_and_modules.sql` — existing
  `has_ever_had_module` constraint, permanent-history trigger, and atomic
  Module-insert history trigger.
- `apps/booking-system-web/src/worker/course-structure/createCoursePersistence.js`
  — current Course mapping and narrow persistence owner.
- `apps/booking-system-web/src/worker/course-structure/createModulePersistence.js`
  — guarded Module insertion that must also preserve the timezone used for
  local-time resolution.
- `apps/booking-system-web/src/worker/course-structure/createCourseHttpHandler.js`
  and `courseHttpContract.js` — current stable detail, current-Admin
  authorization, exact outcome mapping, and response narrowing.
- `apps/booking-system-web/src/browser/course-structure/CourseDetailPage.jsx`
  and `useCourses.js` — stable detail, Course query, and owned nested mutation
  reconciliation.
- `apps/booking-system-web/src/browser/course-structure/CourseCreatePage.jsx` —
  existing German field, validation, and focus patterns.
- `apps/booking-system-web/test/e2e/courseStructure.spec.js` — current real
  Course/Module journey, responsive/axe assertions, and bounded presentation
  route pattern.
- `docs/architecture/persistence.md#migration-contract` and
  `docs/process/verification.md` — schema reuse and layer-specific evidence.

No relevant adjacent `*.docs.md` file exists for the concrete source,
configuration, migration, and test files inspected for this plan.

## Approach

1. Add one booking-domain Course update operation:
   - require the supplied current Admin and Course to be Active;
   - accept one complete editable field set: required nonblank `name`, optional
     string/null `description`, and an explicit valid named IANA/TZDB
     `timezone`;
   - reject fixed offsets, unknown identifiers, and blank timezone on update;
   - compare the desired timezone to the freshly loaded Course timezone and
     reject a change with `course-timezone-locked` when permanent Module
     history is already true;
   - preserve Course identity, lifecycle state, relationships, and permanent
     history in the successful result; and
   - retain authoritative persistence refusals without manufacturing success.
2. Add one guarded Course update capability without a migration:
   - update name, description, and timezone in one SQL statement only for the
     exact Course while the Admin and Course remain Active;
   - guard the Course timezone seen during domain resolution so a concurrent
     timezone change cannot silently accept against another timezone;
   - permit the desired timezone only when it is unchanged or
     `has_ever_had_module = 0` at write acceptance;
   - classify zero changes from current Admin, Course, permanent history, and
     timezone state as exact language-neutral refusals; and
   - leave every field unchanged on stale, refused, or failed acceptance.
3. Close the other side of the timezone/Module race:
   - pass the Course timezone used for local schedule resolution into the
     Module persistence capability;
   - add that exact timezone to the existing guarded Module insert predicate;
   - return `course-timezone-changed` when an otherwise-current insertion loses
     to a timezone edit; and
   - preserve the existing single-statement insert plus history trigger, so
     whichever guarded write is accepted first determines the valid result.
4. Extend the existing same-origin Course HTTP surface:
   - add `PUT /api/admin/courses/:courseId` with complete
     `{ name, description, timezone }` input;
   - ignore browser identity, lifecycle, history, relationship, and Module
     trust fields;
   - return a narrow updated Course on `200`, field refusals on `422`, current-
     state/history conflicts on `409`, current Admin refusal on `403`, unknown
     Course on `404`, and sanitized technical failure on `500`;
   - map `course-timezone-changed` Module creation to `409`; and
   - expose only server-derived `isTimezoneEditable` rather than the raw
     persistence history flag, including on stable detail and update success.
5. Add Course editing to stable Admin detail:
   - keep edit state incidental to `/admin/courses/:courseId` rather than
     introducing another route;
   - use a slice-owned React Hook Form for current name, description, and—only
     while editable—timezone, with the same simple browser validation as
     Course creation;
   - use a slice-owned TanStack mutation that invalidates Course index/detail
     after success and refreshes detail after authoritative conflicts;
   - focus the associated field for local/server validation, and focus
     success, stale/unavailable, or technical feedback after submission;
   - after first Module creation, rely on existing detail invalidation to
     replace the timezone control with permanent-lock copy; and
   - preserve keyboard operation, non-color-only status, direct refresh,
     responsive layout, and axe-clean semantics.
6. Preserve explicit scope:
   - do not add Module rescheduling from `TASK-2u7z6`;
   - do not add Course archival from `TASK-fzniz`;
   - do not add Module deletion from `TASK-3zcmt`; Worker/D1 may delete a test
     row directly to prove the already-accepted future deletion boundary;
   - use a bounded Playwright detail response only for the locked, zero-current-
     Module presentation that the current product UI cannot yet construct; and
   - update canonical implementation-status, application/HTTP, persistence,
     package/module/browser/boundary, verification, dictionary, and index docs
     after evidence is green.

## Non-Goals / Out Of Scope

- Course archival, deletion, or reactivation (`TASK-fzniz`).
- Group editing or lifecycle (`TASK-kmm36`, `TASK-vyj7r`).
- Module descriptive/schedule editing, cancellation, or deletion
  (`TASK-2u7z6`, `TASK-vwciv`, `TASK-3zcmt`).
- Timezone reinterpretation, schedule migration, or automatic rescheduling.
- A new Course version/revision field or audit history.
- A new migration, test-only product endpoint, route, package, first-level
  responsibility, dependency, or boundary permission.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse `has_ever_had_module` | The existing one-way fact and trigger already encode the permanent product boundary. |
| Use one complete-field `PUT` | Course editing replaces the editable representation while server state remains authoritative. |
| Return `isTimezoneEditable` | Browser needs the product predicate, not a persistence column or current Module count. |
| Guard both competing writes | An edit cannot cross first-Module history, and a Module cannot retain local-time resolution from a superseded timezone. |
| Keep editing on stable detail | The form is incidental Course state, not an independently navigable view. |
| Use a bounded zero-Module browser fixture | Actual Module deletion belongs to a later task; D1 owns the real persistence proof now. |

## Phases

### Phase 1: Domain Policy And Atomic Persistence

- [x] Add the Course update factory, package exports, and field/lock/refusal
      domain tests.
- [x] Add guarded Course update persistence and exact refusal classification.
- [x] Add the expected-timezone guard to Module creation persistence.
- [x] Prove successful descriptive/timezone edits, stable identity and
      relationships, failed-Module non-lock, first-Module/permanent lock,
      post-deletion lock, rollback, and the two-sided concurrent race.

**Checkpoint**: Course fields change in one accepted outcome, and no ordering
between timezone edit and Module creation can persist inconsistent schedule
meaning or a partial Course edit.

### Phase 2: HTTP Contract And Current-State Refusal

- [x] Add exact Course-detail `PUT` matching and narrow response editability.
- [x] Cover missing/malformed fields, trust-field exclusion, duplicate names,
      missing/Disabled/stale Admin, unknown/Archived/stale Course, permanent
      lock, stale Module timezone, and sanitized technical failure.
- [x] Verify production composition stays authenticated and fixture-free.

**Checkpoint**: Direct requests can mutate only the authorized editable Course
representation and all stale outcomes are explicit with no field change.

### Phase 3: German Stable-Detail Editing

- [x] Add the slice-owned Course edit mutation and targeted reconciliation.
- [x] Add accessible editable and permanently locked detail states with exact
      German validation and outcome copy.
- [x] Add Playwright real edit/invalid-timezone/first-Module lock and refresh
      evidence plus bounded zero-current-Module permanent-lock presentation.
- [x] Cover keyboard and result focus, desktop/360px layout, direct refresh,
      stale/technical refusal, and axe scans.

**Checkpoint**: Admin Course detail truthfully distinguishes an editable
timezone from a permanently locked one without suggesting later unlock.

### Phase 4: Documentation, Verification, And Completion

- [x] Update affected canonical docs, dictionary coverage, and index routing.
- [x] Run focused domain, Worker/D1, and Playwright suites plus final
      `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and create one semantic commit
      ending in `TASK-7n2my`.

**Checkpoint**: Product behavior, implementation truth, verification evidence,
tracking, and commit history agree.

## Execution Evidence

- Domain: 12 files and 245 tests passed in the final repository gate.
- Worker/D1: 27 files and 174 tests passed, including direct deletion,
  rollback, exact HTTP outcomes, and the concurrent edit/first-Module race.
- Browser: all 34 Chromium tests passed, including the two Course-edit journeys
  with real first-Module locking, bounded zero-current-Module presentation,
  stale/technical focus, responsive widths, refresh, and axe scans.
- `pnpm check` completed successfully on 2026-08-28.

## Testing Strategy

- Booking-domain Vitest owns complete Course fields, valid IANA/TZDB semantics,
  fixed-offset/unknown refusal, permanent lock policy, identity/relationship
  preservation, and persistence outcome propagation.
- Worker/D1 Vitest owns the single guarded edit, no partial field changes,
  first-successful-Module trigger, failed creation non-lock, direct test-row
  deletion with retained lock, actor/Course/history refusal, two-sided race,
  exact HTTP/privacy outcomes, and production composition.
- Playwright owns German real edit success and validation, first-Module lock,
  locked zero-current-Module presentation, stale/technical focus, direct
  refresh, keyboard operation, desktop/360px layout, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced; the
existing Course schema and permanent history remain valid, and local/test D1
state is disposable.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan stays focused on this one Course editing task

## References

- `TASK-7n2my`
- `docs/product/course-structure.md`
- `docs/product/domain-model.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/process/verification.md`
