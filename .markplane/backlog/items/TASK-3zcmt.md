---
id: TASK-3zcmt
title: Delete unreferenced Modules
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: null
depends_on:
- TASK-vwciv
- TASK-jvqrk
blocks:
- TASK-fzniz
related:
- TASK-7n2my
assignee: null
tags:
- module
- deletion
- history
position: e60
created: 2026-08-27
updated: 2026-08-27
---

# Delete unreferenced Modules

## Description

Allow an Active Admin User to hard-delete a Module in an Active Course only
when no retained Module Selection references it. Protect current and
historical participation while allowing truly unreferenced future, ended, or
Cancelled Modules to be removed without inventing empty schedule history.

## Acceptance Criteria

- [ ] A Module may be deleted only while its Course is Active and it has zero
      currently retained Selections, regardless of Scheduled/Cancelled or
      upcoming/in-progress/ended position.
- [ ] Any retained live or historical Selection, including one for a Cancelled
      Module, blocks deletion. A removed/replaced pre-start Selection that no
      longer exists does not block it.
- [ ] Successful deletion removes only the Module and preserves Course,
      Groups, Participants, Assignments, Invites, and unrelated Selections.
- [ ] Deleting the first, last, or every Module never unlocks the Course
      timezone because successful Module creation is permanent history.
- [ ] Current actor, Course, reference, and concurrent state are revalidated at
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
