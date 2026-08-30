---
id: TASK-2u7z6
title: Edit and reschedule Modules
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: PLAN-jmucf
depends_on:
- TASK-6tfxd
- TASK-jvqrk
blocks:
- TASK-vwciv
related:
- TASK-jvqrk
assignee: gerkules
tags:
- module
- scheduling
- time
position: aF
created: 2026-08-27
updated: 2026-08-29
---

# Edit and reschedule Modules

## Description

Complete Module editing in an Active Course: descriptive content remains
editable throughout the Module lifecycle, while the definite schedule may be
changed only before the current `startsAt` and only to another strictly future
valid interval. Retained Selections stay attached to the same Module and use
the new deadline immediately.

## Acceptance Criteria

- [x] An Active Admin User may edit required non-blank title and optional
      description/instructions in an Active Course before start, in progress,
      after end, or after cancellation without changing Module identity or
      retained Selections.
- [x] A Scheduled Module may be rescheduled only while `now < current
      startsAt`; the result requires `newStartsAt > now` and `newEndsAt >
      newStartsAt` as definite instants.
- [x] At exact current `startsAt` or later, both schedule fields are immutable,
      including an attempt to move the Module back into the future. A
      Cancelled Module's schedule is always immutable.
- [x] Local input uses the Course timezone, rejects nonexistent DST times, and
      requires explicit occurrence/offset choice for ambiguous times.
- [x] Rescheduling preserves identity and retained Selections; Participant and
      Admin booking deadlines immediately follow the new `startsAt`.
- [x] Course archival, stale actor state, a concurrent start/cancellation, or
      invalid interval causes a complete refusal without partial descriptive
      or schedule mutation.

## UI/UX Expectations

Use separate but coherent German-first MUI descriptive and schedule forms so
schedule immutability does not block permitted content edits. Display Course
timezone and ambiguity choice clearly. Loading, validation, success, locked,
stale, and technical-error states are responsive, keyboard-operable,
focus-correct, and non-color-only. Direct Module refresh preserves context.

## Verification Evidence Required

- Booking-domain Vitest with an injected clock for before/exact/after start,
  interval rules, cancellation, DST gap/overlap, and Selection deadline shift.
- Worker/D1 tests for atomic edits, current state/time authorization,
  concurrent start/cancel/archive outcomes, and retained identity/references.
- Playwright for descriptive edits across temporal states, valid/invalid
  reschedule, exact deadline refusal, DST ambiguity, refresh, responsive
  widths, keyboard/focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Cancellation is `TASK-vwciv`; deletion is `TASK-3zcmt`. No schedule history,
recurrence, configurable booking deadline, or conflict warning is added.
Create a fresh implementation plan when selected.

## References

- `docs/product/course-structure.md#descriptive-edits`
- `docs/product/course-structure.md#schedule-edits`
- `docs/product/course-structure.md#course-timezone`
- `docs/product/representative-scenarios.md#o-backdated-module-refusal`
- `docs/product/representative-scenarios.md#p-module-deadline-and-schedule-immutability`
- `docs/product/module-participation.md#startsat-deadline`
- `docs/process/verification.md`

## Completion Evidence

- Focused booking-domain operations share the creation resolver while proving
  complete descriptive lifetime, before/exact/after-current-start, future
  interval, cancellation, DST gap/overlap, identity, and refusal behavior.
- Guarded D1 descriptive and schedule updates recheck current actor/Course,
  exact prior interval, Scheduled state, accepted instant, and unchanged
  timezone; real tests preserve every retained Selection and prove the stored
  `startsAt` becomes the new mutation deadline without reference rewrites.
- Two nested `PUT` resources derive Course/Module/time state server-side,
  ignore trust fields, return narrow current editability, and cover stale,
  cross-Course, technical, cancellation, and concurrent acceptance outcomes.
- German stable-detail Module cards keep descriptive and schedule forms
  independent, expose explicit DST choices and lock copy, reconcile Admin and
  Participant caches, preserve refresh context, and have unique accessible
  form landmarks at desktop and 360px widths.
- `pnpm check` passed on 2026-08-29: ESLint and boundary rules, 315 booking-
  domain tests, 250 Worker/D1 tests, production builds, and 40 Chromium
  Playwright tests.
