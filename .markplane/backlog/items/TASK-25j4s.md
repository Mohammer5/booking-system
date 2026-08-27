---
id: TASK-25j4s
title: Disable and re-enable Participants
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-bh5dj
plan: null
depends_on:
- TASK-ca46j
- TASK-jvqrk
blocks:
- TASK-49if4
- TASK-h37zt
related:
- TASK-ikzih
assignee: null
tags:
- participant
- lifecycle
- authorization
- selections
position: d30
created: 2026-08-27
updated: 2026-08-27
---

# Disable and re-enable Participants

## Description

Give Active Admin Users the complete reversible Participant Disable/Re-enable
lifecycle. Disable is global participant-facing access control and one atomic
retention boundary across all Courses; it preserves identity and membership
while removing only still-future Scheduled-Module Selections. Re-enable
restores eligibility, not deleted booking intent.

## Acceptance Criteria

- [ ] A freshly resolved Active Admin User can Disable an Active Participant
      and Re-enable a Disabled Participant; Participants cannot change their
      own lifecycle state and stale/Disabled Admin actions are refused.
- [ ] Disable atomically removes every Selection for a Scheduled Module where
      `now < startsAt` across all Courses, retains Scheduled Selections where
      `startsAt <= now`, and retains all Cancelled-Module Selections.
- [ ] Every retained Selection is historical while Disabled, including
      in-progress and ended records. Disable preserves every Active/Revoked
      Course Assignment, Course structure, Invite, and historical relationship.
- [ ] Disabled Participants receive no normal Participant application, Course,
      Join, profile-edit, or Selection-mutation access, but may authenticate and
      sign out and see an appropriate unavailable state.
- [ ] Re-enable preserves the same Participant and all Assignment states,
      restores access only where an Active Assignment permits it, and never
      restores removed future Selections.
- [ ] A legitimately retained in-progress Scheduled Selection becomes live
      again after Re-enable only when Course and Assignment are Active and
      `now < endsAt`; at exact `endsAt` it remains historical.
- [ ] Disable/Re-enable never mutates an Admin User backed by the same external
      principal and is validated against authoritative current state with no
      partial removal on failure.

## UI/UX Expectations

Admin Participant views expose state and only the applicable action. Disable
uses a German MUI destructive confirmation that explains future-Selection
removal without claiming history or membership deletion. Confirmation focus is
trapped/restored correctly; success, unavailable, and stale states are
announced without color-only meaning. Disabled Participant entry offers a safe
sign-out path. Desktop and narrow/mobile layouts are covered.

## Verification Evidence Required

- Booking-domain Vitest with an injected clock for future, exact start,
  in-progress, exact end, ended, and Cancelled retention plus Re-enable live
  derivation and Assignment preservation.
- Worker/D1 tests for atomic multi-Course deletion/retention, authoritative
  Admin state, no cross-identity cascade, rollback on refusal, and persisted
  state across refresh.
- Playwright for Admin confirmation, global Disabled refusal, sign-out,
  Re-enable access, removed-future/non-restoration and retained-history views,
  mobile/desktop, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Participant hard deletion, self-disable, self-leave, audit history, and
automatic future-Selection restoration remain non-goals. Assignment lifecycle
is owned by `TASK-smtvk`. Create a fresh implementation plan when selected.

## References

- `docs/product/course-access.md#participant-global-access-state`
- `docs/product/course-access.md#disable`
- `docs/product/course-access.md#re-enable`
- `docs/product/module-participation.md#participant-disable`
- `docs/product/module-participation.md#participant-re-enable-in-progress`
- `docs/product/representative-scenarios.md#f-participant-disable`
- `docs/product/representative-scenarios.md#g-participant-re-enable`
- `docs/product/domain-model.md#selection-validity-and-history`
- `docs/process/verification.md`
