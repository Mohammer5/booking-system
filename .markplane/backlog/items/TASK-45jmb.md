---
id: TASK-45jmb
title: List and edit Admin Users
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-hc9uu
plan: PLAN-zk9un
depends_on:
- TASK-rrp92
blocks:
- TASK-qhred
related:
- TASK-ca46j
assignee: gerkules
tags:
- admin
- profile
- authorization
- ui
position: g30
created: 2026-08-27
updated: 2026-08-29
---

# List and edit Admin Users

## Description

Provide the complete current Admin User directory and authorized name editing.
The view must distinguish domain state and authority from authentication and
enforce ordinary-Admin versus Super-Admin target boundaries freshly for every
edit while allowing each Active Admin to edit their own name.

## Acceptance Criteria

- [x] Every current Admin User is listed with required name, ordinary Admin or
      Super Admin authority, and Active or Disabled state; legitimately deleted
      Admin Users need not appear.
- [x] An Active Admin User may edit their own required non-blank name without
      changing identity, state, authority, principal, or relationships.
- [x] An ordinary Active Admin may edit another ordinary Admin's name but may
      not edit any Super Admin. An Active Super Admin may edit another ordinary
      or Super Admin's name.
- [x] Disabled actors have no access. Current actor/target state and authority
      are revalidated at acceptance so stale promotion/disable/delete changes
      make an unauthorized edit lose without partial mutation.
- [x] Provider profile data never controls the booking-system name; matching
      names do not merge identities or affect a Participant backed by the same
      principal.

## UI/UX Expectations

Use a directly navigable German-first MUI Admin directory/detail experience
with responsive list/table alternatives, explicit authority/state labels, and
only permitted actions. Empty/loading/error/unavailable/edit-success states,
semantic headers, accessible edit forms, keyboard/focus behavior, direct
refresh, non-color-only status, and axe scans are required.

## Verification Evidence Required

- Booking-domain Vitest for self/ordinary/Super target matrices, name
  validation, identity preservation, and stale authority outcomes.
- Worker/D1 tests for fresh actor/target authorization, atomic edit, no
  cross-identity cascade, and narrow representations.
- Playwright using fixed ordinary/Super/Disabled identities for list and each
  allowed/refused edit, stale state, refresh, responsive widths,
  keyboard/focus, privacy, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Promotion is `TASK-qhred`; Disable/Re-enable/delete is `TASK-ikzih`. No Admin
email/profile expansion, demotion, identity merge, or audit history is added.
Create a fresh implementation plan when selected.

## References

- `docs/product/admin-access.md#name-and-onboarding`
- `docs/product/admin-access.md#ordinary-admin-user-authority`
- `docs/product/admin-access.md#super-admin-administration-and-self-protection`
- `docs/product/admin-access.md#admin-user-view`
- `docs/product/domain-model.md#admin-user`
- `docs/process/verification.md`
