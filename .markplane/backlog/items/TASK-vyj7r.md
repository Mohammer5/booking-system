---
id: TASK-vyj7r
title: Delete unreferenced Groups
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: PLAN-scxe4
depends_on:
- TASK-kmm36
blocks:
- TASK-fzniz
related:
- TASK-kmm36
assignee: gerkules
tags:
- group
- deletion
- history
position: e30
created: 2026-08-27
updated: 2026-08-29
---

# Delete unreferenced Groups

## Description

Allow an Active Admin User to hard-delete an unreferenced Group from an Active
Course. The decision depends only on currently retained Module Selections, not
on an invented complete reference audit, and must protect every live or
historical retained relationship.

## Acceptance Criteria

- [x] An Active or Archived Group may be deleted only while its Course is
      Active and no currently retained Selection references it.
- [x] Any retained upcoming, in-progress, ended, or Cancelled-Module Selection
      blocks deletion regardless of whether that Selection is currently live
      or historical.
- [x] A pre-start Selection that was removed or replaced and no longer exists
      does not block deletion; no separate past-reference audit is consulted.
- [x] Successful deletion removes only the Group and does not mutate Course,
      Module, Participant, Assignment, Invite, or unrelated Selection state.
- [x] Current actor, Course, and retained-reference state are revalidated at
      acceptance; a stale/concurrent new reference makes deletion lose with no
      partial effect.

## UI/UX Expectations

Expose Delete only in the Admin Group context and use a German MUI destructive
confirmation naming the target and permanence. Blocked state explains that a
retained participation reference exists without exposing private Participant
data. Dialog focus, cancellation/restoration, success notification, responsive
layout, keyboard operation, and non-color-only status are required.

## Verification Evidence Required

- Booking-domain Vitest for the complete retained-reference matrix and absence
  of a past-reference rule.
- Worker/D1 tests for foreign-key/reference protection, atomic stale races,
  current authorization/Course state, and non-cascade behavior.
- Playwright for allowed deletion after removal, blocked historical and
  Cancelled references, confirmation/cancel, direct refresh, mobile/desktop,
  keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Course deletion does not exist. Group archival/reactivation is `TASK-kmm36`.
Do not create an audit-history table just to remember removed choices. Create a
fresh implementation plan when selected.

## References

- `docs/product/course-structure.md#hard-deletion`
- `docs/product/domain-model.md#time-and-lifecycle`
- `docs/product/representative-scenarios.md#u-group-deletion`
- `docs/product/module-participation.md#history-attendance-and-notifications`
- `docs/process/verification.md`

## Completion Evidence

- A focused booking-domain operation permits only Active/Archived same-Course
  Groups for an Active Admin and Active Course, blocks every current Selection
  row identically, and contains no past-reference rule.
- One guarded D1 delete plus the existing restrictive Selection foreign key
  rechecks actor, Course, Group, and references, gives concurrent deletion/new-
  Selection attempts one valid winner, and preserves every other row/history.
- `DELETE /api/admin/courses/:courseId/groups/:groupId` derives all state
  server-side and returns narrow privacy-safe outcomes with stale and technical
  failures sanitized.
- German MUI Group cards provide a distinct permanent-deletion Dialog with
  Cancel-first focus, restoration, private blockers, parent-owned success,
  Admin/Participant cache reconciliation, refresh, and responsive axe evidence.
- `pnpm check` passed on 2026-08-29: ESLint and boundary rules, 286 booking-
  domain tests, 217 Worker/D1 tests, production builds, and 38 Chromium
  Playwright tests.
