---
id: TASK-49if4
title: Inspect administrative participation
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-h8fpz
plan: PLAN-pchnp
depends_on:
- TASK-25j4s
- TASK-smtvk
- TASK-kmm36
- TASK-vwciv
- TASK-fzniz
blocks:
- TASK-2nh3b
related:
- TASK-jvqrk
assignee: gerkules
tags:
- admin
- participation
- history
- ui
position: h10
created: 2026-08-27
updated: 2026-08-29
---

# Inspect administrative participation

## Description

Provide Active Admin Users with the complete read-side Course participation
view needed for membership administration and assisted booking. It must compose
Course Participants, Assignment state, Modules, Groups, and each Participant's
retained current/historical Selections without persisting a Selection status or
leaking administration data into Participant views.

## Acceptance Criteria

- [x] An Active Admin User can inspect Active and Archived Courses, their
      Participants and Active/Revoked Assignment states, Modules, Groups, and
      each Participant's retained Selections relevant to administration.
- [x] Selection presentation derives live/historical meaning from current
      Participant, Assignment, Course, Module lifecycle, and definite `now`;
      no Selection status is stored or trusted.
- [x] Exact transition to historical state is visible at `endsAt`, cancellation,
      Assignment revocation, Participant Disable, and Course archival; valid
      reactivation/Re-enable may make retained in-progress participation live.
- [x] Archived Group identity/details remain visible for retained in-progress
      or historical Selections where required, while the Group is unavailable
      for new future choices.
- [x] Course/Participant/Module identifiers are authorized against current
      Admin state; Disabled/missing Admins and stale requests receive no data.
- [x] Participant browser/API views remain unchanged and never receive roster,
      peer profile/email/Selection, Group counts, or Admin information merely
      because this read model exists.

## UI/UX Expectations

Use directly navigable, refresh-safe German MUI Course participation views with
responsive list/table/detail alternatives. Assignment, Participant, Module,
Group, and live/historical states are distinguishable without color alone.
Loading, empty, unavailable, and technical-error states preserve context and
safe navigation. Semantic headers, keyboard navigation, visible focus,
mobile/desktop behavior, and axe scans are required.

## Verification Evidence Required

- Booking-domain Vitest with injected time for the complete derived-status
  predicate and retained Archived Group identity.
- Worker/D1 tests for composed representations across every lifecycle state,
  current Admin authorization, Archived inspection, and Participant privacy.
- Playwright for Active/Archived Courses and future/in-progress/ended/
  Cancelled/Disabled/Revoked/Archived histories, direct refresh, privacy probes,
  responsive widths, keyboard/focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Assisted mutations are `TASK-2nh3b`. No attendance proof, audit history,
Participant-visible roster, Group count, or exported report is introduced.
Create a fresh implementation plan when selected.

## References

- `docs/product/course-access.md#admin-user-visibility`
- `docs/product/admin-access.md#admin-user-identity`
- `docs/product/module-participation.md#exact-live-and-historical-meaning`
- `docs/product/module-participation.md#lifecycle-effects-on-selections`
- `docs/product/course-structure.md#active-and-archived-lifecycle`
- `docs/product/representative-scenarios.md#w-live-and-historical-selection-transitions`
- `docs/product/non-goals.md#adjacent-product-concerns`
- `docs/process/verification.md`
