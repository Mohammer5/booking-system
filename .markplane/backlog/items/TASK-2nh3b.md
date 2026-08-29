---
id: TASK-2nh3b
title: Manage Admin-assisted Module Selections
status: done
priority: medium
type: feature
effort: large
epic: EPIC-h8fpz
plan: PLAN-kc7in
depends_on:
- TASK-49if4
blocks:
- TASK-h37zt
related:
- TASK-smtvk
assignee: gerkules
tags:
- admin
- selection
- assignment
- atomicity
position: h20
created: 2026-08-27
updated: 2026-08-29
---

# Manage Admin-assisted Module Selections

## Description

Allow an Active Admin User to set or remove an existing Active Participant's
ordinary Module Selection through the administration participation view. A
successful set may create a missing Assignment or reactivate a Revoked one only
as part of the same atomic outcome; refusal must never leave membership behind.

## Acceptance Criteria

- [x] Set-Selection accepts only an existing fully registered Active
      Participant, Active Admin actor, Active Course, Scheduled Module, Active
      same-Course Group, and definite `now < startsAt`.
- [x] On successful set, no Assignment becomes one ordinary Active Assignment,
      an Active Assignment remains unchanged, and a Revoked Assignment is
      reactivated in the Active Course; one Assignment per pair is preserved.
- [x] No Selection becomes Group G, the same Group is idempotent, and another
      eligible Group atomically replaces the old choice leaving exactly one
      current Selection.
- [x] Refusal for Disabled Participant/Admin, Archived Course, Cancelled or
      started Module, Archived/cross-Course Group, stale state, or invalid
      target leaves no new/reactivated Assignment and leaves the prior Selection
      unchanged.
- [x] Admin-assisted removal before `startsAt` leaves no Selection and creates
      or reactivates no Assignment. At exact `startsAt`, after cancellation, or
      in an Archived Course, removal is refused.
- [x] The Admin has no late-booking, lifecycle, capacity, conflict, or
      authorization override. Participant and Admin mutations share the exact
      `startsAt` deadline and Selection meaning.
- [x] Concurrent set/remove/Assignment/lifecycle changes are accepted from
      authoritative current state and preserve one coherent atomic outcome.

## UI/UX Expectations

The German MUI participation view exposes eligible Group choice, current
Selection, Assignment consequence, pending/success/validation/stale/unavailable
states, and removal confirmation. It never suggests that a Disabled
Participant can be booked or that an Assignment alone means participation.
Responsive layout, direct refresh, keyboard/dialog focus restoration,
accessible names, non-color-only states, and axe scans are required.

## Verification Evidence Required

- Booking-domain Vitest for eligibility, Assignment composition, idempotence,
  replacement/removal, exact deadline, every refusal, and overlap allowance.
- Worker/D1 tests for atomic Assignment+Selection creation/reactivation,
  rollback on every refusal, unique/concurrent outcomes, and current actor/
  target/lifecycle authorization.
- Playwright for no/Active/Revoked Assignment set, reselect/replace/remove,
  Disabled/Archived/Cancelled/cross-Course/exact-deadline refusals, no-partial
  evidence, refresh, responsive widths, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

This creates no parallel Admin booking entity or membership origin. No
late-booking override, Participant creation, capacity, approval, conflict
warning, attendance, notification, or complete audit history is added. Create
a fresh implementation plan when selected.

## References

- `docs/product/module-participation.md#admin-assisted-booking`
- `docs/product/module-participation.md#existing-active-participant-and-membership`
- `docs/product/module-participation.md#eligibility-and-deadline`
- `docs/product/module-participation.md#coherent-refusal`
- `docs/product/course-access.md#course-assignment-through-admin-assisted-booking`
- `docs/product/representative-scenarios.md#ag-admin-assisted-booking`
- `docs/product/representative-scenarios.md#ah-stale-actions-lose-to-current-state`
- `docs/process/verification.md`
