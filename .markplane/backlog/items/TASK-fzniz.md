---
id: TASK-fzniz
title: Archive Courses with read-only historical access
status: done
priority: medium
type: feature
effort: large
epic: EPIC-i2x79
plan: PLAN-xcz4u
depends_on:
- TASK-7n2my
- TASK-vyj7r
- TASK-3zcmt
- TASK-vwciv
- TASK-smtvk
- TASK-qk47b
blocks:
- TASK-5gny6
- TASK-49if4
- TASK-h37zt
related:
- TASK-vwciv
assignee: gerkules
tags:
- course
- archival
- history
- authorization
position: aI
created: 2026-08-27
updated: 2026-08-29
---

# Archive Courses with read-only historical access

## Description

Complete the terminal Course archival boundary. An Active Course may become
permanently Archived only after every Scheduled Module has ended or been
Cancelled. Archival freezes structure and booking without rewriting history,
while preserving authorized Admin inspection and eligible Participant
read-only access until Assignment revocation.

## Acceptance Criteria

- [x] Archival is refused while any Scheduled Module has `now < endsAt`,
      including upcoming and in-progress Modules. At exact `endsAt` it no
      longer blocks; a Cancelled Module does not block even when its original
      `endsAt` is future.
- [x] Successful archival is terminal, never hard-deletes/reactivates the
      Course, and does not cancel Modules or remove/rewrite Groups, Modules,
      Assignments, Invites, or Selections.
- [x] Archived Course name/description/timezone, Groups, Modules, current
      Invite, Assignment addition/reactivation, and Participant/Admin-assisted
      Selection mutation are structurally read-only with authoritative stale
      refusal.
- [x] An Active Admin User can list, directly inspect, and distinguish Archived
      Courses. Existing Active Assignments may still be revoked, but Revoked
      Assignments cannot reactivate there.
- [x] An Active Participant with an Active Assignment retains directly
      navigable read-only access to appropriate Course/Module/Group details and
      only their own Selections; later revocation removes access. Disabled or
      Revoked users receive no Course data.
- [x] Every retained Selection is historical after archival, and the current
      Course Invite is unusable for Join; no private data becomes public.
- [x] Concurrent archival and structural/booking mutations are evaluated from
      current state so no mixed partial outcome is accepted.

## UI/UX Expectations

Use a German MUI archival confirmation explaining permanence, blockers, and
read-only consequences. Admin index/detail exposes Archived state and only
permitted actions. Participant history is clearly read-only and private.
Loading, empty, blocked, success, stale, and unavailable states work at
desktop/mobile widths with keyboard/dialog focus, direct refresh, accessible
names, non-color-only status, and axe scans.

## Verification Evidence Required

- Booking-domain Vitest with definite instants for blocker boundaries,
  structural freeze, derived history, Invite refusal, and read-only access.
- Worker/D1 tests for atomic archive/mutation races, full no-rewrite behavior,
  authorization/privacy, post-archive revocation, and reactivation refusal.
- Playwright for blocked/allowed archive, Admin Archived inspection, every
  prohibited mutation surface, Participant read-only access and revocation,
  privacy/direct refresh, responsive widths, keyboard/dialog focus, and axe.
- Full `pnpm check`.

## Out Of Scope / Notes

Course deletion/reactivation and automatic Module cancellation do not exist.
Remote retention/backup policy is release/operations work, not this task.
Create a fresh implementation plan when selected.

## References

- `docs/product/course-structure.md#course-lifecycle`
- `docs/product/course-structure.md#archival-preconditions`
- `docs/product/course-structure.md#structurally-read-only-archived-course`
- `docs/product/course-access.md#archived-course`
- `docs/product/module-participation.md#module-cancellation-and-course-archival`
- `docs/product/representative-scenarios.md#v-archived-course-is-read-only`
- `docs/product/representative-scenarios.md#w-live-and-historical-selection-transitions`
- `docs/process/verification.md`
