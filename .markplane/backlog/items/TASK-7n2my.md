---
id: TASK-7n2my
title: Edit Courses and govern timezone changes
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: null
depends_on:
- TASK-6tfxd
blocks:
- TASK-fzniz
related:
- TASK-3zcmt
assignee: null
tags:
- course
- timezone
- lifecycle
position: e10
created: 2026-08-27
updated: 2026-08-27
---

# Edit Courses and govern timezone changes

## Description

Allow Active Admin Users to edit an Active Course's name and description and,
only before scheduling has ever begun, its valid IANA/TZDB timezone. The
timezone lock is permanent historical state established by the first
successful Module creation, not a count of current Modules.

## Acceptance Criteria

- [ ] An Active Course's required non-blank name and optional description can
      be edited without changing Course identity or any relationship; Course
      names remain non-unique.
- [ ] Its timezone can change to another valid IANA/TZDB identifier only while
      Active and before any Module has ever been created successfully; fixed
      UTC offsets and unknown identifiers are refused.
- [ ] The first successful Module creation permanently freezes timezone. A
      failed creation does not freeze it, and later deletion of the first,
      last, or every Module never restores editability.
- [ ] Timezone changes do not reinterpret, migrate, or reschedule Modules; the
      permitted change necessarily occurs before any successful Module.
- [ ] Current Admin and Course state plus permanent scheduling history are
      revalidated at acceptance. A stale/concurrent edit that loses to Module
      creation or Course archival is refused with no partial field change.

## UI/UX Expectations

The Admin Course detail provides German-first MUI edit forms with timezone
selection, a clear locked explanation, validation and stale/unavailable
states, and non-color-only lifecycle status. Fields and errors are accessible,
keyboard-operable, focus-correct, responsive, and refresh-safe. No disabled
control falsely implies a timezone can later unlock.

## Verification Evidence Required

- Booking-domain Vitest for fields, valid timezone semantics, permanent lock,
  and stale acceptance outcomes.
- Worker/D1 tests for durable ever-created state, atomic race between timezone
  edit and Module create, preservation after Module deletion, authorization,
  and rollback.
- Playwright for edit success/refusal, invalid timezone, first-Module lock,
  post-deletion lock, direct refresh, responsive widths, keyboard/focus, and
  axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Module rescheduling is `TASK-2u7z6`; Course archival is `TASK-fzniz`. Do not
add Course deletion/reactivation or timezone reinterpretation. Create a fresh
implementation plan when selected.

## References

- `docs/product/course-structure.md#course-structure`
- `docs/product/course-structure.md#course-timezone`
- `docs/product/domain-model.md#time-and-lifecycle`
- `docs/product/representative-scenarios.md#n-course-timezone-and-dst`
- `docs/architecture/persistence.md#migration-contract`
- `docs/process/verification.md`
