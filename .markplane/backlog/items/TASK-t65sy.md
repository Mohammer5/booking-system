---
id: TASK-t65sy
title: Implement Google authentication and Admin sign-in
status: done
priority: medium
type: feature
effort: medium
epic: null
plan: PLAN-rpau9
depends_on: []
blocks:
- TASK-ic4fu
- TASK-wny83
- TASK-rrp92
related: []
assignee: gerkules
tags:
- authentication
- admin
- google
position: a1
created: 2026-08-27
updated: 2026-08-27
---

# Implement Google authentication and Admin sign-in

## Description

Turn the existing `/admin` route into a real Google-authentication entry while
preserving Better Auth as the application-owned authentication layer, its one
D1-backed opaque session, and fresh contextual Admin resolution from booking
state. First Admin registration must authenticate before collecting the
booking-system Admin User name; later sign-ins must never create an Admin User.

This standalone task follows the completed first-Admin foundation. It is not
part of `EPIC-m22qh`, whose scope explicitly defers real provider integration,
and it does not rewrite the completed scope of `TASK-aeij8`.

## Acceptance Criteria

- [x] Google is configured in Worker-owned Better Auth from environment-owned
      credentials, with one `/api/auth/callback/google` callback and no secret
      exposed to browser code or committed configuration.
- [x] Implicit and manual provider/account linking are disabled explicitly;
      distinct unlinked external principals remain distinct.
- [x] On a fresh installation, unauthenticated `/admin` presents first-Admin
      registration through Google and does not show the Admin name form until a
      normal Better Auth session exists.
- [x] After bootstrap is consumed, unauthenticated `/admin` presents Google
      login; Active Admins enter administration, while principals without an
      Admin User and Disabled Admins receive distinct refusals without domain
      identity creation.
- [x] Active, missing-Admin, and Disabled-Admin authenticated states can sign
      out through Better Auth, terminate the session, refresh Admin state, and
      return to the correct unauthenticated entry.
- [x] Manual development is fixed to `http://localhost:5173` with strict-port
      behavior, while deterministic tests remain independent of real Google
      credentials and hosted Google UI.
- [x] Focused Worker and browser tests prove provider wiring, fixed callback
      and application destinations, no-linking configuration, sign-in state
      flow, sign-out, bootstrap invariants, and production fixture exclusion.
- [x] Canonical architecture, boundary, verification, release, setup, and
      status documentation accurately distinguishes implemented local Google
      support from still-deferred production credentials/infrastructure and
      other providers.

## Notes

Microsoft, Facebook, Apple, Participant authentication/onboarding, passwords,
account linking or merging, Admin Invites, production deployment, and release
hardening remain outside this task. Routine Playwright continues to establish
fixed non-production identities rather than automating Google.

The canonical `pnpm check` passed on 2026-08-27 with 21 repository-tooling
tests, 8 booking-domain tests, 17 Worker/D1 tests, the production build, and the
expanded Chromium E2E. A value-based audit found no local provider credential
in tracked files, Git history, or generated artifacts.

## References

- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/browser-conventions.md`
- `docs/architecture/boundaries.md`
- `docs/product/admin-access.md#first-admin-bootstrap`
- `docs/process/verification.md`
- `docs/process/releases.md`
- `TASK-aeij8`
- `PLAN-92d7i`
- `EPIC-m22qh`
