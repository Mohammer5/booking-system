---
id: TASK-kmm36
title: Edit, archive, and reactivate Groups
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-i2x79
plan: PLAN-qeb8a
depends_on:
- TASK-jvqrk
blocks:
- TASK-vyj7r
- TASK-49if4
related:
- TASK-vyj7r
assignee: gerkules
tags:
- group
- lifecycle
- selections
position: aD
created: 2026-08-27
updated: 2026-08-28
---

# Edit, archive, and reactivate Groups

## Description

Complete the reversible Group lifecycle in an Active Course. Admin Users may
edit Active or Archived Groups, archive a Group when only current retained
future booking intent does not block it, and reactivate the same identity
subject to current Active-name uniqueness. Retained in-progress/history must
continue identifying the Group and its details.

## Acceptance Criteria

- [x] An Active Admin User may edit required non-blank name and optional
      details for an Active or Archived Group while its Course is Active;
      identity, Course ownership, and retained Selections remain unchanged.
- [x] Active Group names remain unique within one Course after trimming and
      case-insensitive comparison. Archived Groups may conflict; an Active
      Group edit or reactivation that would conflict is refused atomically.
- [x] Archival is blocked only by a retained Selection for a Scheduled Module
      where `now < startsAt`; retained in-progress, ended, and Cancelled-Module
      Selections do not block it and are neither removed nor rewritten.
- [x] An Archived Group is unavailable for new future Selections, while an
      already retained in-progress/historical Selection continues to display
      that same Group identity and details.
- [x] Reactivation preserves identity/details, restores future eligibility,
      does not restore removed Selections, and revalidates normalized-name
      uniqueness against authoritative current state.
- [x] No edit/archive/reactivation is accepted after Course archival; stale
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

## Completion Evidence

- Focused `course-structure` factories own complete Group editing, exact
  injected-time archival eligibility, and retained-identity reactivation with
  normalized Active-name checks.
- D1 persistence and same-origin HTTP recheck current Admin/Course/Group/name/
  reference state atomically, preserve every Selection, classify stale and
  concurrent losers, and prove rollback plus two-sided Selection/name races.
- Stable German Admin Course detail provides accessible Active/Archived edit
  cards and lifecycle Dialogs; Participant history retains selected Archived
  Group identity, details, state, and derived meaning while future choices
  remain Active-only.
- `pnpm check` passed on 2026-08-28: ESLint and boundary rules, 272 booking-
  domain tests, 196 Worker/D1 tests, production build, and 36 Chromium
  Playwright tests.
