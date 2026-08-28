---
id: TASK-vwciv
title: Cancel Modules and preserve Selection history
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: PLAN-ybc4q
depends_on:
- TASK-2u7z6
- TASK-jvqrk
blocks:
- TASK-3zcmt
- TASK-fzniz
- TASK-49if4
related:
- TASK-fzniz
assignee: gerkules
tags:
- module
- cancellation
- history
- selections
position: e50
created: 2026-08-27
updated: 2026-08-29
---

# Cancel Modules and preserve Selection history

## Description

Allow Active Admin Users to terminally Cancel an upcoming or in-progress
Scheduled Module before its exact `endsAt`. Cancellation retains all current
Selections as history, makes new or changed participation unavailable, and
must be one authoritative atomic lifecycle outcome.

## Acceptance Criteria

- [x] A Scheduled Module in an Active Course may be Cancelled while `now <
      endsAt`, including before `startsAt` and while in progress.
- [x] At exact `endsAt` or later, after Course archival, or by a non-Active
      Admin User, cancellation is refused with no state or Selection change.
- [x] Cancellation is terminal: no uncancel/reactivation exists and its
      original `startsAt`/`endsAt` remain immutable.
- [x] Every retained Selection remains stored, immediately becomes historical,
      continues identifying its Participant and Group, and is unavailable for
      creation, replacement, or removal.
- [x] Concurrent cancellation/booking/edit attempts are decided from current
      state so only still-eligible operations succeed and no partial lifecycle
      or Selection outcome remains.

## UI/UX Expectations

The Admin Module view exposes a German MUI destructive confirmation before the
deadline and a clear terminal status afterwards. It explains that existing
Selections remain as history. Participant/Admin views show cancellation and
historical participation without color-only meaning. Dialog focus,
success/stale/error states, responsive layout, keyboard operation, and direct
refresh are required.

## Verification Evidence Required

- Booking-domain Vitest with definite instants for upcoming, exact start,
  in-progress, exact end, ended, terminal repeat, and derived history.
- Worker/D1 tests for atomic cancellation, retained references, concurrent
  booking/cancellation, current authorization/Course state, and rollback.
- Playwright for upcoming/in-progress cancel, exact-end refusal, terminal
  presentation, retained Participant/Admin history, prohibited mutation,
  responsive widths, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

No uncancel, notification, attendance, or audit workflow is introduced.
Module deletion is `TASK-3zcmt`; Course archival is `TASK-fzniz`. Create a
fresh implementation plan when selected.

## References

- `docs/product/course-structure.md#cancellation`
- `docs/product/module-participation.md#module-cancellation-and-course-archival`
- `docs/product/representative-scenarios.md#q-module-cancellation-boundary`
- `docs/product/representative-scenarios.md#w-live-and-historical-selection-transitions`
- `docs/product/domain-model.md#time-and-lifecycle`
- `docs/process/verification.md`

## Completion Evidence

- The booking operation captures one injected definite instant and covers
  upcoming, exact-start, in-progress, exact-end, ended, terminal, stale actor/
  Course, ownership, field retention, and authoritative persistence outcomes.
- One guarded D1 state update rechecks Active Admin/Course, same-Course
  Scheduled state, and `ends_at > accepted_now`; 12 focused integration cases
  retain all Selection rows and Module fields, cover cancellation/Selection/
  reschedule/edit races, and prove trigger-failure rollback.
- The body-free nested cancellation resource derives current authorization,
  ownership, instant, and action availability server-side, returns narrow
  privacy-safe outcomes, and exposes retained Participant history without an
  Admin roster or Selection side effect.
- Stable German Module cards provide destructive confirmation, terminal and
  historical copy, exact deadline/stale/technical focus, refresh behavior,
  immutable schedule with continued descriptive editing, responsive layout,
  keyboard operation, and axe coverage.
- `pnpm check` passed on 2026-08-29: ESLint and boundary rules, 329 booking-
  domain tests, 276 Worker/D1 tests, production Worker/browser builds, and 42
  Chromium Playwright tests.
- No migration, uncancel action, notification, attendance, audit workflow,
  Module route, Admin participation roster, package, dependency, boundary-map
  permission, or architecture checker was introduced.
