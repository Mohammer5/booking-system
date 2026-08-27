---
id: TASK-2u7z6
title: Edit and reschedule Modules
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: null
depends_on:
- TASK-6tfxd
- TASK-jvqrk
blocks:
- TASK-vwciv
related:
- TASK-jvqrk
assignee: null
tags:
- module
- scheduling
- time
position: e40
created: 2026-08-27
updated: 2026-08-27
---

# Edit and reschedule Modules

## Description

Complete Module editing in an Active Course: descriptive content remains
editable throughout the Module lifecycle, while the definite schedule may be
changed only before the current `startsAt` and only to another strictly future
valid interval. Retained Selections stay attached to the same Module and use
the new deadline immediately.

## Acceptance Criteria

- [ ] An Active Admin User may edit required non-blank title and optional
      description/instructions in an Active Course before start, in progress,
      after end, or after cancellation without changing Module identity or
      retained Selections.
- [ ] A Scheduled Module may be rescheduled only while `now < current
      startsAt`; the result requires `newStartsAt > now` and `newEndsAt >
      newStartsAt` as definite instants.
- [ ] At exact current `startsAt` or later, both schedule fields are immutable,
      including an attempt to move the Module back into the future. A
      Cancelled Module's schedule is always immutable.
- [ ] Local input uses the Course timezone, rejects nonexistent DST times, and
      requires explicit occurrence/offset choice for ambiguous times.
- [ ] Rescheduling preserves identity and retained Selections; Participant and
      Admin booking deadlines immediately follow the new `startsAt`.
- [ ] Course archival, stale actor state, a concurrent start/cancellation, or
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
