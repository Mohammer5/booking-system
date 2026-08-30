---
id: TASK-jvqrk
title: Manage Participant Module Selections
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: PLAN-sqii3
depends_on:
- TASK-qk47b
blocks:
- TASK-smtvk
- TASK-25j4s
- TASK-kmm36
- TASK-2u7z6
- TASK-vwciv
- TASK-3zcmt
- TASK-ikzih
related:
- TASK-2u7z6
- TASK-49if4
assignee: gerkules
tags:
- participant
- selection
- time
- ui
position: a8
created: 2026-08-27
updated: 2026-08-28
---

# Manage Participant Module Selections

## Description

Allow an eligible Participant to explicitly choose, change, or remove their
own Group choice for a future Scheduled Module. Completing this capability
proves that Course Assignment answers membership while Module Selection
independently records whether and how the Participant intends to participate.
Persist the Selection through D1, expose it through the Participant Course
view, and derive its current temporal presentation from authoritative state
rather than introducing a stored Selection status.

## Acceptance Criteria

- [x] For one Participant and Module, exactly zero or one Module Selection
      exists; no Selection means non-participation and Course membership never
      creates one implicitly.
- [x] The Participant explicitly chooses the Group; the system does not choose
      a default, preferred, previous, or first available Group.
- [x] Creating or changing a Selection requires an Active Participant, Active
      Course Assignment, Active Course, Active Group, and Scheduled Module
      where `now < startsAt`, with the selected Group and Module belonging to
      the same Course.
- [x] Selecting the already-selected Group is an idempotent successful no-op,
      while choosing another eligible Group replaces the existing Selection
      and leaves exactly the new current choice.
- [x] Eligible pre-start removal leaves no Selection and therefore records
      non-participation.
- [x] Replaced or removed pre-start values are not retained merely as audit
      history or represented by a cancelled-booking state.
- [x] Creation, replacement, and removal stop at exact `startsAt`; every
      mutation is validated against authoritative current state so a stale
      action cannot bypass current eligibility or the deadline.

- [x] One Participant may select overlapping Modules within or across Courses;
      no warning or conflict prevention is introduced.
- [x] D1 enforces at most one Selection per Participant/Module and same-Course
      references. Concurrent valid changes leave one accepted current Group;
      any refused change leaves the prior Selection unchanged.
- [x] A retained Selection is presented as live while every live predicate is
      true and `now < endsAt`, and becomes historical at exact `endsAt`; this
      meaning is derived, never persisted as a Selection status.

## UI/UX Expectations

The Participant Course/Module view uses German-first MUI controls to show no
choice, current Group, eligibility, deadline, and live/historical meaning.
Create/change/removal exposes pending, success, validation, stale/unavailable,
and technical-error states. Removal uses an appropriate accessible
confirmation where destructive intent would otherwise be unclear. Keyboard,
focus restoration, mobile/desktop layout, direct refresh, and non-color-only
status behavior are explicit acceptance surfaces.

## Verification Evidence Required

- Booking-domain Vitest for eligibility, idempotence, replacement/removal,
  exact `startsAt`/`endsAt`, overlap allowance, same-Course integrity, and
  derived live/historical meaning with injected clocks/definite instants.
- Worker/D1 tests for migrations, unique/foreign-key constraints, atomic
  replacement, concurrency, fresh authorization/deadline checks, and no
  partial side effects.
- Playwright for choose/reselect/change/remove, missing choice, stale deadline
  or Assignment loss, overlapping Modules, refresh, responsive layouts,
  keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

Completed locally with 184 booking-domain tests, 118 Worker/D1/migration tests,
both production builds, and all 25 Chromium E2E tests passing through the final
canonical `pnpm check`. The composed Module Selection journey covers explicit
choice, idempotent reselect, replacement, independent overlapping Modules,
refresh, removal confirmation/focus restoration, missing choice, stale
deadline refusal, privacy, responsive widths, and axe scans.

## Out Of Scope / Notes

Admin-assisted booking is owned by `TASK-2nh3b`. Cancellation, Assignment
revocation, Participant Disable, Group archival, and Course archival own their
specific retention transitions. Capacities, approvals, attendance,
notifications, configurable deadlines, automatic Group choice, and complete
change history remain excluded. Create a fresh implementation plan when
selected.

## References

- `docs/product/domain-model.md#module-selection`
- `docs/product/domain-model.md#selection-validity-and-history`
- `docs/product/module-participation.md#participation-state`
- `docs/product/module-participation.md#participant-booking-eligibility`
- `docs/product/module-participation.md#changing-the-selected-group`
- `docs/product/module-participation.md#removing-participation`
- `docs/product/module-participation.md#startsat-deadline`
- `docs/product/module-participation.md#concurrent-and-stale-changes`
- `docs/product/module-participation.md#exact-live-and-historical-meaning`
- `docs/product/module-participation.md#scheduling-conflicts`
- `docs/product/representative-scenarios.md#e-normal-participation`
- `docs/product/representative-scenarios.md#p-module-deadline-and-schedule-immutability`
- `docs/product/representative-scenarios.md#w-live-and-historical-selection-transitions`
- `docs/product/representative-scenarios.md#ai-overlapping-modules`
- `docs/process/verification.md`
