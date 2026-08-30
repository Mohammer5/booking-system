---
id: TASK-wny83
title: Create, list, and revoke Admin Invites
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-hc9uu
plan: PLAN-mdzku
depends_on:
- TASK-dfq2k
- TASK-t65sy
blocks:
- TASK-rrp92
related:
- TASK-k2ckf
assignee: gerkules
tags:
- admin-invite
- security
- ui
position: aL
created: 2026-08-27
updated: 2026-08-29
---

# Create, list, and revoke Admin Invites

## Description

Provide the authenticated Admin Invite administration lifecycle: any Active
Admin User may create independently Active one-time Invites, see the complete
URL only in the creation result, later list non-secret state, and Revoke an
Active Invite. Admin Invites remain distinct from reusable Course Invites.

## Acceptance Criteria

- [x] Any freshly resolved Active Admin User can create a new Active Admin
      Invite; several independently Active Invites may coexist.
- [x] The complete URL/secret is shown and copyable exactly in the successful
      creation result and is not recoverable through later reads, refresh,
      logs, analytics, or persistence-facing representations.
- [x] The Admin Invite list exposes creation time and Active, Claimed, or
      Revoked state for every Invite, plus Revoke only for currently Active
      Invites; it never returns the complete URL.
- [x] Any Active Admin User may transition an Active Invite to terminal
      Revoked regardless of creator. Claimed and Revoked Invites cannot be
      revoked again, re-enabled, reactivated, deleted, or reused.
- [x] Admin Invites do not expire automatically. Losing an Active URL is
      handled by Revoking it and creating another, not secret recovery.
- [x] Current actor and Invite state is revalidated so concurrent Revoke/claim
      attempts produce one terminal outcome and no partial or secret-leaking
      result.

## UI/UX Expectations

Use a directly navigable German-first MUI Admin Invite list with truthful empty,
loading, error, and terminal states. Creation opens an accessible one-time URL
result with copy acknowledgement and a clear warning that refresh cannot
recover it. Revocation uses a destructive confirmation with correct focus
trap/restoration. State is not color-only and desktop/mobile are covered.

## Verification Evidence Required

- Booking-domain Vitest for lifecycle, coexistence, authorization outcomes,
  terminal states, and no expiration/reactivation/deletion.
- Worker/D1 tests for migration, secret-safe persistence/serialization,
  one-time creation response, concurrent terminal transition, fresh Admin
  authorization, and no partial side effects.
- Playwright for empty/create/copy/refresh-no-recovery/list/revoke/replacement
  recovery, responsive widths, keyboard/dialog focus, and axe scans.
- Secret-value scanning of logs/responses/artifacts plus full `pnpm check`.

## Out Of Scope / Notes

Claim/onboarding is `TASK-rrp92`. No direct Super Admin grant, expiry, Invite
deletion, recoverable secret, email targeting, or remote email delivery is
introduced. Create a fresh implementation plan when selected.

## References

- `docs/product/admin-access.md#admin-invites`
- `docs/product/admin-access.md#independent-creation-and-lifecycle`
- `docs/product/admin-access.md#url-visibility-and-loss`
- `docs/product/admin-access.md#admin-invite-view`
- `docs/product/representative-scenarios.md#ad-admin-invite-url-loss`
- `docs/product/non-goals.md#invitations-and-accounts`
- `docs/architecture/browser-conventions.md#diagnostic-logging`
- `docs/process/verification.md`
