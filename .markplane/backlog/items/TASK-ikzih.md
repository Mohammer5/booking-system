---
id: TASK-ikzih
title: Disable, re-enable, and delete Admin Users
status: backlog
priority: medium
type: feature
effort: large
epic: EPIC-hc9uu
plan: null
depends_on:
- TASK-qhred
- TASK-jvqrk
- TASK-k2ckf
blocks:
- TASK-h37zt
related:
- TASK-25j4s
assignee: null
tags:
- admin
- lifecycle
- super-admin
- authorization
position: g50
created: 2026-08-27
updated: 2026-08-27
---

# Disable, re-enable, and delete Admin Users

## Description

Complete Admin User state and deletion management while protecting authority
and availability. Authorized actors may Disable, Re-enable, or delete other
Admin Users within the ordinary/Super target matrix, but self-protection and
the last-Active-Super-Admin invariant are checked against authoritative current
state. Domain content and a Participant sharing the principal never cascade.

## Acceptance Criteria

- [ ] An ordinary Active Admin may Disable, Re-enable, or delete another
      ordinary Admin but may not mutate any Super Admin. An Active Super Admin
      may perform those actions on another ordinary or Super Admin subject to
      the invariant below.
- [ ] No Admin User may Disable/delete themselves or alter their own authority,
      even when several Super Admins exist. Disabled actors have no Admin
      access or mutation authority.
- [ ] Every accepted Disable/delete leaves at least one Active Super Admin.
      Stale and concurrent requests that would remove the final Active Super
      Admin are refused atomically; a Disabled Super Admin does not satisfy the
      invariant until Re-enabled.
- [ ] Re-enable preserves Admin identity and authority. Deletion removes the
      current Admin identity; its principal receives no Admin access through
      the still-existing Better Auth session and can return only through a new
      Invite as a new ordinary identity.
- [ ] Disable/delete never changes Courses, Groups, Modules, Participants,
      Assignments, Selections, Course Invites, Admin Invites, or a Participant
      backed by the same external principal. Previously accepted actions remain
      authoritative.
- [ ] Every request resolves actor/target current state and authority fresh;
      no session role or stale list action bypasses the rules, and refusal has
      no partial side effect.

## UI/UX Expectations

The German MUI Admin directory exposes only authorized state/delete actions.
Disable and delete use destructive confirmations explaining access loss and
non-cascade; last-Super/self refusals are explicit. Deleted users disappear
from the current list. Dialog focus/restoration, loading/success/stale/error,
responsive list/table behavior, keyboard operation, non-color-only states,
direct refresh, and axe scans are required.

## Verification Evidence Required

- Booking-domain Vitest for full ordinary/Super/self/Disabled matrix,
  last-Active-Super-Admin invariant, re-enable preservation, and no cascades.
- Worker/D1 tests for atomic concurrent final-Super attempts, fresh session
  resolution, delete/re-enable persistence, Invite-return semantics, and
  unchanged rows across every named domain concept.
- Playwright with multiple fixed Admins/Super Admins for allowed/refused
  actions, concurrent/stale UI outcomes, post-disable/delete access, shared
  Participant independence, responsive widths, keyboard/dialog focus, axe.
- Full `pnpm check`.

## Out Of Scope / Notes

No demotion, transfer/succession, complete audit log, authentication-user
deletion, or Participant cascade is added. Admin Invite return behavior is
implemented in `TASK-rrp92`. Create a fresh implementation plan when selected.

## References

- `docs/product/admin-access.md#authority-and-lifecycle`
- `docs/product/admin-access.md#ordinary-admin-user-authority`
- `docs/product/admin-access.md#super-admin-administration-and-self-protection`
- `docs/product/admin-access.md#at-least-one-active-super-admin`
- `docs/product/admin-access.md#no-cascades`
- `docs/product/representative-scenarios.md#z-super-admin-protection`
- `docs/product/representative-scenarios.md#af-admin-disable-or-deletion-does-not-cascade`
- `docs/product/domain-model.md#administration-and-invitations`
- `docs/process/verification.md`
