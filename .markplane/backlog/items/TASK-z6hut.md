---
id: TASK-z6hut
title: Assign Participants to Courses
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: PLAN-p6dvs
depends_on:
- TASK-ubm2q
- TASK-7uxjj
blocks:
- TASK-qk47b
- TASK-ca46j
related: []
assignee: gerkules
tags:
- participant
- assignment
- membership
- ui
position: c40
created: 2026-08-27
updated: 2026-08-28
---

# Assign Participants to Courses

## Description

Allow an Active Admin User to discover fully registered Participants and
establish ordinary Course membership by direct administrative Course
Assignment. This enables access to the intended Course while preserving the
central distinction between Course membership and Module participation.
Deliver the Participant directory, Course membership view, and direct
Assignment action through the Admin browser with D1-enforced identity and
cardinality.

## Acceptance Criteria

- [x] An Active Admin User can discover every fully registered Participant,
      including a Participant with zero Course Assignments, through a minimum
      representation containing name, email, and Active or Disabled global
      state.
- [x] A fully registered Participant with no Assignment can receive one Active
      Course Assignment to an Active Course through direct administrative
      assignment.
- [x] Assigning a Participant who already has an Active Assignment to that
      Course is an idempotent successful no-op.
- [x] A Participant/Course pair never receives duplicate Course Assignments.
- [x] Direct Assignment creates ordinary Course membership only and does not
      implicitly create a Module Selection or a separate origin-specific
      membership state.

- [x] Direct Assignment accepts a fully registered Active or Disabled
      Participant for an Active Course, rejects unknown/incomplete people and
      Archived Courses, and validates the acting Admin and Course state again
      at acceptance.
- [x] The Course administration view lists current membership and Assignment
      state, while the global Participant directory remains discoverable even
      when a Participant has zero Assignments.
- [x] A stale or concurrent assignment attempt preserves exactly one
      Participant/Course Assignment and has no partial Selection or identity
      side effect.

## UI/UX Expectations

Provide German-first MUI Participant discovery and Course-membership views
with loading, empty, unavailable, success, and validation states. Name, email,
global Participant state, and Assignment state are distinguishable without
color-only cues. Assignment controls are keyboard-operable, responsive, and
restore focus predictably after a dialog or mutation. Direct links and refresh
return to the same Course/member view.

## Verification Evidence Required

- Booking-domain Vitest for one-Assignment-per-pair, Active/Disabled target
  eligibility, idempotent Active assignment, and no implicit Selection.
- Worker/D1 tests for migrations, uniqueness/concurrency, current Admin and
  Course authorization, fully registered targets, Archived refusal, and no
  partial side effects.
- Playwright for global discovery including zero-membership Participants,
  Course membership empty/list/assign flows, idempotent repeat, Disabled
  target, stale refusal, direct refresh, privacy, responsive widths,
  keyboard/focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Revoked Assignment reactivation and revocation effects are owned by
`TASK-smtvk`; Course Invite Join is owned by `TASK-5gny6`. Participant profile
edits and global lifecycle are separate. Do not add pending Participants,
origin-specific membership states, or Participant self-leave. Create a fresh
implementation plan when selected.

Completed locally with 132 booking-domain tests, 81 Worker/D1/migration tests,
both production builds, and 21 Chromium E2E tests passing through the final
canonical `pnpm check`. The focused Course Assignment browser suite also passes
all 4 scenarios with its axe, focus, keyboard, responsive, privacy, and
overflow assertions intact.

## References

- `docs/product/domain-model.md#course-assignment`
- `docs/product/domain-model.md#structure-and-membership`
- `docs/product/course-access.md#participant-administration`
- `docs/product/course-access.md#administrative-assignment`
- `docs/product/course-access.md#administration-while-disabled`
- `docs/product/course-access.md#admin-user-visibility`
- `docs/architecture/persistence.md#migration-contract`
- `docs/process/verification.md`
