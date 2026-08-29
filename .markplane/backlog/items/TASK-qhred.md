---
id: TASK-qhred
title: Promote Admin Users to Super Admin
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-hc9uu
plan: PLAN-vyd23
depends_on:
- TASK-45jmb
blocks:
- TASK-ikzih
related: []
assignee: gerkules
tags:
- admin
- super-admin
- authorization
position: g40
created: 2026-08-27
updated: 2026-08-29
---

# Promote Admin Users to Super Admin

## Description

Allow an Active Super Admin to promote an Active ordinary Admin User to Super
Admin while preserving identity and enabling several coexisting Super Admins.
Promotion is explicit and one-way; no actor, Invite, or alternate path grants
or removes this authority outside the accepted operation.

## Acceptance Criteria

- [x] A freshly resolved Active Super Admin may promote another current Active
      ordinary Admin User; identity, name, state, principal, and all existing
      relationships remain unchanged.
- [x] Multiple Super Admins may coexist, and every promoted user immediately
      receives current Super Admin mutation authority through fresh domain
      resolution rather than session claims.
- [x] Ordinary Admins, Disabled actors, self-promotion, Disabled targets,
      already-Super targets, and Invite creation/claim cannot perform or imply
      promotion.
- [x] Promotion is one-way in v1: no demotion action exists for self or others.
- [x] Actor and target authority/state are revalidated at acceptance;
      concurrent/stale promotions are idempotent or refused coherently and
      never create another Admin identity or partial authority state.

## UI/UX Expectations

The Admin directory exposes Promote only for eligible Active ordinary targets
to an Active Super Admin. A German MUI confirmation explains the permanent
one-way authority change. Success/stale/unavailable states update immediately,
with correct dialog focus/restoration, responsive layout, keyboard operation,
non-color-only authority labels, and axe scans.

## Verification Evidence Required

- Booking-domain Vitest for complete actor/target matrix, identity
  preservation, several Super Admins, no demotion, and concurrency/idempotence.
- Worker/D1 tests for atomic authority update, fresh session-independent
  authorization, stale target state, and no partial/cascade effects.
- Playwright for eligible promotion, ordinary/Disabled/self refusals, immediate
  promoted authority, absence of demotion, responsive widths,
  keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Super Admin demotion/transfer/succession remains a non-goal. State lifecycle
and last-Active-Super-Admin protection are `TASK-ikzih`. Create a fresh
implementation plan when selected.

## References

- `docs/product/admin-access.md#super-admin-promotion`
- `docs/product/admin-access.md#authority-and-lifecycle`
- `docs/product/representative-scenarios.md#y-super-admin-promotion`
- `docs/product/non-goals.md#identity-participant-and-admin-lifecycle`
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
- `docs/process/verification.md`
