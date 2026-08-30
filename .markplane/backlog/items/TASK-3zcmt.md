---
id: TASK-3zcmt
title: Delete unreferenced Modules
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: PLAN-wareq
depends_on:
- TASK-vwciv
- TASK-jvqrk
blocks:
- TASK-fzniz
related:
- TASK-7n2my
assignee: gerkules
tags:
- module
- deletion
- history
position: aH
created: 2026-08-27
updated: 2026-08-29
---

# Delete unreferenced Modules

## Description

Allow an Active Admin User to hard-delete a Module in an Active Course only
when no retained Module Selection references it. Protect current and
historical participation while allowing truly unreferenced future, ended, or
Cancelled Modules to be removed without inventing empty schedule history.

## Acceptance Criteria

- [x] A Module may be deleted only while its Course is Active and it has zero
      currently retained Selections, regardless of Scheduled/Cancelled or
      upcoming/in-progress/ended position.
- [x] Any retained live or historical Selection, including one for a Cancelled
      Module, blocks deletion. A removed/replaced pre-start Selection that no
      longer exists does not block it.
- [x] Successful deletion removes only the Module and preserves Course,
      Groups, Participants, Assignments, Invites, and unrelated Selections.
- [x] Deleting the first, last, or every Module never unlocks the Course
      timezone because successful Module creation is permanent history.
- [x] Current actor, Course, reference, and concurrent state are revalidated at
      acceptance; stale deletion loses without partial effects.

## UI/UX Expectations

Use a German MUI destructive confirmation that names the Module and permanence.
Blocked state explains retained participation without leaking private data.
After success, focus returns to the Module list and the empty state is truthful.
Desktop/mobile, keyboard, focus restoration, direct refresh, non-color-only
status, and axe scans are required.

## Verification Evidence Required

- Booking-domain Vitest for the full retained-reference and lifecycle matrix.
- Worker/D1 tests for reference constraints, atomic stale races, non-cascade
  deletion, current authorization/Course state, and permanent timezone lock.
- Playwright for eligible future/ended/Cancelled deletion, blocked historical
  reference, confirmation/cancel, post-last-delete timezone refusal, refresh,
  responsive widths, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Course hard deletion and empty Module audit history are excluded. Module
cancellation is `TASK-vwciv`; timezone editing is `TASK-7n2my`. Create a fresh
implementation plan when selected.

## References

- `docs/product/course-structure.md#hard-deletion-1`
- `docs/product/course-structure.md#course-timezone`
- `docs/product/representative-scenarios.md#r-module-deletion`
- `docs/product/representative-scenarios.md#n-course-timezone-and-dst`
- `docs/product/domain-model.md#time-and-lifecycle`
- `docs/process/verification.md`

## Completion Evidence

- `createDeleteModule` accepts only an Active actor and Course plus a
  same-Course Scheduled or Cancelled Module, blocks every currently retained
  Selection context independent of time position, and permits a removed past
  reference. Its focused 17-case domain matrix covers eligible lifecycle/time
  positions, all retained-reference forms, ownership/state refusal, and exact
  persistence propagation.
- One guarded D1 delete rechecks Active Admin/Course, ownership, and zero
  current Selection rows. Seventeen focused persistence cases prove future,
  ended, and Cancelled deletion; unrelated-row preservation; first/last/every
  permanent timezone history; stale and trigger outcomes; restrictive foreign
  keys; and both valid deletion/new-Selection race winners without a migration.
- The body-free existing Module-item `DELETE` derives references server-side,
  returns privacy-safe blocker/stale outcomes, sanitizes failures, and leaves
  descriptive update routes unchanged. Nine focused Worker HTTP cases cover
  production composition, authorization, cross-Course privacy, post-read
  reference insertion, removed-reference eligibility, and timezone refusal.
- Stable German MUI cards and Dialogs name the Module and permanence, focus
  cancel/error/success states, restore the invoking action on dismissal,
  reconcile Admin and Participant detail, and present a truthful last-row empty
  state while the timezone remains locked. Two Playwright journeys cover real
  future/Cancelled deletion, bounded ended/blocker/stale/technical states,
  refresh, keyboard, desktop/360px layout, and axe scans.
- `pnpm check` passed in one uninterrupted run on 2026-08-29: ESLint and
  boundary rules, 346 booking-domain tests, 302 Worker/D1 tests, production
  Worker/browser builds, and all 44 Chromium Playwright tests.
- No migration, Course deletion, Module tombstone/restore/audit history,
  Selection cascade, empty schedule history, route, dependency, boundary-map
  permission, or architecture checker was introduced.
