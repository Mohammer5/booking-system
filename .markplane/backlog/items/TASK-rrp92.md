---
id: TASK-rrp92
title: Complete invited Admin onboarding
status: done
priority: medium
type: feature
effort: large
epic: EPIC-hc9uu
plan: PLAN-5inhn
depends_on:
- TASK-wny83
- TASK-t65sy
blocks:
- TASK-45jmb
related:
- TASK-7uxjj
- TASK-5gny6
assignee: gerkules
tags:
- admin-invite
- onboarding
- authentication
- atomicity
position: g20
created: 2026-08-27
updated: 2026-08-29
---

# Complete invited Admin onboarding

## Description

Complete later Admin admission through an Active one-time Admin Invite. A
prospective Admin safely continues through Google authentication, supplies an
explicit booking-system name, and atomically creates one new ordinary Active
Admin User while claiming the Invite. Opening or abandoning the flow creates
nothing and consumes nothing.

## Acceptance Criteria

- [x] A valid Active Invite reveals only that Admin registration is available;
      unknown, Claimed, Revoked, or otherwise unusable Invites show a common
      unavailable result with no Admin/creator/Course information.
- [x] Authentication continuation preserves application state without placing
      the raw Invite secret in Google OAuth URLs, callback parameters,
      referrers, logs, analytics, or unrelated responses.
- [x] After authentication, onboarding requires an explicit non-blank Admin
      User name. Provider profile data may prefill but is not authoritative.
- [x] Final acceptance atomically revalidates Invite and principal, creates one
      new ordinary Active Admin User with a new stable domain identity, and
      transitions the Invite from Active to terminal Claimed.
- [x] A principal already backing a current Active or Disabled Admin User is
      refused without creating/re-enabling an Admin User or consuming/changing
      the Invite.
- [x] A legitimately deleted Admin principal may use a new Active Invite to
      create a new ordinary identity/name; deleted identity, state, and Super
      Admin authority are not restored.
- [x] Competing claims allow only the first accepted completion; every loser
      receives refusal and leaves no partial Admin User. Starting earlier gives
      no precedence.
- [x] Invited onboarding never grants Super Admin directly, creates a pending
      Admin, expires/reactivates an Invite, or creates a Participant.

## UI/UX Expectations

The public Invite, Google continuation, required-name, unavailable, and success
views use German-first MUI states and safe language. Refresh and abandonment do
not consume the Invite. The name form and errors are accessible, and focus is
predictable after stale/concurrent loss. Desktop/mobile, keyboard navigation,
visible focus, non-color-only status, and axe scans are required.

## Verification Evidence Required

- Booking-domain Vitest for name, current/deleted principal policy, ordinary
  authority, and terminal Invite outcomes.
- Worker/D1 tests for migration, atomic User+claim transaction, competing
  claims, existing Active/Disabled refusal, deleted-principal new identity,
  and secret continuation/logging boundaries.
- Authentication structural tests for fixed same-origin destinations and
  production fixture exclusion; never automate Google's hosted UI.
- Playwright for valid onboarding, invalid name, abandonment, unavailable
  tokens, existing/Disabled refusal without consumption, deleted return, two
  competing fixed principals, refresh, responsive widths, keyboard/focus, axe.
- Full `pnpm check`.

## Out Of Scope / Notes

Admin management and promotion are later tasks. Do not add passwords, account
linking, direct Super Admin Invite, expiry, reuse, deletion, or secret recovery.
Create a fresh implementation plan when selected.

## References

- `docs/product/admin-access.md#pre-onboarding-visibility`
- `docs/product/admin-access.md#claiming-and-invited-onboarding`
- `docs/product/admin-access.md#existing-and-deleted-admin-users`
- `docs/product/representative-scenarios.md#aa-admin-invite-claim`
- `docs/product/representative-scenarios.md#ab-existing-admin-claims-another-invite`
- `docs/product/representative-scenarios.md#ac-deleted-admin-returns`
- `docs/product/representative-scenarios.md#ae-concurrent-admin-invite-claim`
- `docs/architecture/authentication-and-sessions.md#invite-continuation`
- `docs/process/verification.md`
