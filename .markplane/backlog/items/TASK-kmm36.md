---
id: TASK-kmm36
title: Edit, archive, and reactivate Groups
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: null
depends_on:
- TASK-jvqrk
blocks:
- TASK-vyj7r
- TASK-49if4
related:
- TASK-vyj7r
assignee: null
tags:
- group
- lifecycle
- selections
position: e20
created: 2026-08-27
updated: 2026-08-27
---

# Edit, archive, and reactivate Groups

## Description

Complete the reversible Group lifecycle in an Active Course. Admin Users may
edit Active or Archived Groups, archive a Group when only current retained
future booking intent does not block it, and reactivate the same identity
subject to current Active-name uniqueness. Retained in-progress/history must
continue identifying the Group and its details.

## Acceptance Criteria

- [ ] An Active Admin User may edit required non-blank name and optional
      details for an Active or Archived Group while its Course is Active;
      identity, Course ownership, and retained Selections remain unchanged.
- [ ] Active Group names remain unique within one Course after trimming and
      case-insensitive comparison. Archived Groups may conflict; an Active
      Group edit or reactivation that would conflict is refused atomically.
- [ ] Archival is blocked only by a retained Selection for a Scheduled Module
      where `now < startsAt`; retained in-progress, ended, and Cancelled-Module
      Selections do not block it and are neither removed nor rewritten.
- [ ] An Archived Group is unavailable for new future Selections, while an
      already retained in-progress/historical Selection continues to display
      that same Group identity and details.
- [ ] Reactivation preserves identity/details, restores future eligibility,
      does not restore removed Selections, and revalidates normalized-name
      uniqueness against authoritative current state.
- [ ] No edit/archive/reactivation is accepted after Course archival; stale
      actor, Course, name, or retained-reference state wins at acceptance.

## UI/UX Expectations

Admin Group rows/details use German-first MUI editing and state actions. An
archive confirmation explains future eligibility and any current blocker;
reactivation conflicts identify the field without leaking unrelated data.
Status, retained history, loading/success/error/unavailable states are
responsive, keyboard-operable, focus-correct, and non-color-only.

## Verification Evidence Required

- Booking-domain Vitest with injected time for normalized-name rules, the
  exact upcoming/in-progress/ended/Cancelled blocker matrix, retained identity,
  and reactivation/no-restoration.
- Worker/D1 tests for atomic lifecycle/uniqueness/reference checks,
  authorization, concurrency/stale state, and rollback.
- Playwright for edit/archive blocked and allowed/reactivate conflict and
  success, retained Group details in Participant/Admin history, refresh,
  responsive widths, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Hard deletion is `TASK-vyj7r`. Groups remain Course-wide with no capacities or
per-Module availability. Archived Course structure is handled by `TASK-fzniz`.
Create a fresh implementation plan when selected.

## References

- `docs/product/course-structure.md#editing-and-active-name-uniqueness`
- `docs/product/course-structure.md#active-and-archived-lifecycle`
- `docs/product/module-participation.md#exact-live-and-historical-meaning`
- `docs/product/representative-scenarios.md#s-group-archival-during-an-in-progress-module`
- `docs/product/representative-scenarios.md#t-group-reactivation-and-name-conflict`
- `docs/product/domain-model.md#time-and-lifecycle`
- `docs/process/verification.md`
