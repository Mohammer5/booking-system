---
id: TASK-smtvk
title: Revoke and reactivate Course Assignments
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-bh5dj
plan: PLAN-gzu8z
depends_on:
- TASK-jvqrk
blocks:
- TASK-fzniz
- TASK-5gny6
- TASK-49if4
related:
- TASK-2nh3b
assignee: gerkules
tags:
- assignment
- membership
- lifecycle
- authorization
position: aA
created: 2026-08-27
updated: 2026-08-28
---

# Revoke and reactivate Course Assignments

## Description

Complete Course Assignment administration after initial direct assignment.
Admin Users must see membership state, revoke access in Active or Archived
Courses, and reactivate retained membership only in Active Courses while
applying the exact Selection-retention boundary atomically. Membership remains
Course-specific and independent across Courses.

## Acceptance Criteria

- [x] Course administration represents each current Participant Assignment as
      Active or Revoked and offers only actions permitted by current Course,
      actor, and Assignment state.
- [x] Revoking an Active Assignment in an Active or Archived Course removes
      Scheduled-Module Selections where `now < startsAt`, retains Scheduled
      Selections where `startsAt <= now`, retains Cancelled-Module Selections,
      and makes all retained Selections historical.
- [x] Revoking an already-Revoked Assignment is an idempotent successful no-op
      and never changes another Course's Assignment or Selection state.
- [x] Direct assignment/reactivation in an Active Course reuses the one
      retained Assignment, is an idempotent no-op when already Active, and may
      target an Active or Disabled fully registered Participant.
- [x] Reactivation never restores removed future Selections. A retained
      in-progress Selection becomes live again only when Participant, Course,
      Assignment, and Module predicates are currently eligible before
      `endsAt`.
- [x] A Revoked Assignment cannot be reactivated in an Archived Course; no
      Assignment can be added there. Refusal leaves membership and Selection
      state unchanged.
- [x] Participant access and privacy update immediately from fresh Assignment
      state: revocation removes Course access and blocks self-reactivation via
      Invite; reactivation restores only eligible access.

## UI/UX Expectations

Use German-first MUI membership lists, status labels, and confirmation dialogs.
Revocation explains future-Selection removal and access loss; reactivation does
not promise restoration. Empty, pending, success, stale, unavailable, and
technical-error states are responsive, keyboard-operable, focus-correct, and
non-color-only. Direct Course-member URLs refresh safely.

## Verification Evidence Required

- Booking-domain Vitest with injected time for idempotence, exact retention at
  `startsAt`, reactivation/live predicates, Archived refusal, and multi-Course
  independence.
- Worker/D1 tests for atomic Assignment/Selection mutation, uniqueness,
  current authorization, concurrency/stale outcomes, and rollback.
- Playwright for view/revoke/repeat/reactivate, immediate access/privacy
  changes, retained history, Archived refusal, multi-Course isolation,
  responsive widths, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Completion Evidence

- Added one retained Active/Revoked Assignment lifecycle with guarded
  reactivation and atomic revocation/future-Scheduled-Selection removal.
- Added exact domain, Worker/D1, HTTP/privacy, rollback, concurrency, fresh
  access, German MUI, responsive, focus, retained-history, and axe coverage.
- Updated canonical implementation status, architecture, persistence, browser,
  verification, dictionary, and index documentation.
- `pnpm check` passes: 214 booking-domain tests, 146 Worker/D1 tests, production
  build, and 30 Chromium Playwright tests.

## Out Of Scope / Notes

Participant self-leave and Assignment deletion do not exist. Invite Join cannot
self-reactivate a revoked Assignment. Admin-assisted booking's conditional
reactivation is owned by `TASK-2nh3b`; Course archival is `TASK-fzniz`. Create
a fresh implementation plan when selected.

## References

- `docs/product/domain-model.md#course-assignment`
- `docs/product/course-access.md#administrative-assignment`
- `docs/product/course-access.md#assignment-revocation-and-reactivation`
- `docs/product/course-access.md#multiple-courses`
- `docs/product/module-participation.md#course-assignment-revocation`
- `docs/product/module-participation.md#assignment-reactivation-in-progress`
- `docs/product/representative-scenarios.md#j-repeated-and-revoked-invite-use`
- `docs/product/representative-scenarios.md#k-assignment-revocation`
- `docs/product/representative-scenarios.md#l-assignment-reactivation-in-progress`
- `docs/process/verification.md`
