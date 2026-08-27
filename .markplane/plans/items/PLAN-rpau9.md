---
id: PLAN-rpau9
title: Google authentication and Admin sign-in
status: draft
implements:
- TASK-t65sy
related: []
created: 2026-08-27
updated: 2026-08-27
---

# Google Authentication And Admin Sign-In Implementation Plan

## Overview

Implement `TASK-t65sy` as one web-application vertical slice. The existing
Better Auth composition gains Google, the existing `/admin` slice gains fixed
Google sign-in and sign-out actions, and current Admin outcomes continue to
come from the existing public entry and authoritative current-context APIs.

The provider callback remains `/api/auth/callback/google`; `/admin` is only the
fixed post-authentication application destination. Routine tests keep using
normal D1-backed fixture sessions.

## Ground Truth

- `apps/booking-system-web/src/authentication/createAuthentication.js` —
  Better Auth/D1 composition and the narrow external-principal seam.
- `apps/booking-system-web/src/productionWorker.js` and
  `src/nonProductionWorker.js` — environment-owned composition and structural
  fixture separation.
- `apps/booking-system-web/src/worker/createWorkerApplication.js` — same-origin
  `/api/auth/*` and Admin request routing.
- `apps/booking-system-web/src/browser/admin-bootstrap/*` — current `/admin`
  query, form, localization, and presentation ownership.
- `apps/booking-system-web/src/worker/admin-bootstrap/adminHttp.worker.test.js`
  and `test/e2e/adminBootstrap.spec.js` — existing Worker and browser evidence.
- `apps/booking-system-web/boundaries.config.mjs` — deny-by-default browser and
  authentication import permissions.
- `docs/architecture/authentication-and-sessions.md` — one session, stable
  principal, contextual resolution, and no-linking policy.
- `docs/product/admin-access.md` — bootstrap order and refusal behavior.
- `docs/process/verification.md` — fixture-session and full-check contract.
- `EPIC-m22qh` — explicit provider-integration exclusion from that epic.

## Approach

- Extend `createAuthentication` with explicit Google Client ID/Secret inputs,
  configure `socialProviders.google`, and set both implicit and explicit
  account linking off. Keep the provider and Better Auth types private to the
  web application.
- Pass `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and
  `GOOGLE_CLIENT_SECRET` from both Worker composition roots. Missing normal
  authentication configuration fails closed; non-production tests receive
  safe deterministic values rather than real credentials.
- Add a slice-local Better Auth React client. Its Google action always sends
  `provider: "google"`, `callbackURL: "/admin"`, and one fixed same-origin
  error destination. No caller supplies a destination.
- Sanitize callback failures through an application-owned same-origin redirect
  before rendering one localized authentication-failure state; never display
  or propagate provider payloads or OAuth material.
- Evolve `useAdminBootstrap` to query current Admin state whenever necessary,
  initiate Google sign-in, and sign out. Successful sign-out invalidates or
  removes current Admin query state and refreshes public entry state.
- Present authentication entry before the name form on fresh bootstrap. Once
  authenticated, show the form only for legitimately available bootstrap.
  After consumption, show Active, no-Admin, Disabled, or unauthenticated states
  without creating domain state.
- Put sign-out in every authenticated state needed for recovery. Keep German
  strings in the existing semantic `adminAccess` translation resource.
- Configure only normal `vite.config.js` development for
  `localhost:5173`/strict port; preserve Playwright's existing deterministic
  `127.0.0.1:4173` harness.
- Add `BETTER_AUTH_SECRET` to the committed example alongside the existing
  Google placeholders. Keep real values only in ignored local environment or
  future environment-scoped secret configuration.

## Non-Goals / Out of Scope

- Microsoft, Facebook, or Apple providers.
- Participant UI, onboarding, or provider continuation.
- Passwords, MFA, account linking/merging/transfer, or provider-profile-owned
  Admin data.
- New booking-facing auth/session APIs, roles or permissions in sessions, or a
  separate Admin session/callback.
- Admin Invites or any later booking feature.
- Remote Cloudflare resources, production provider credentials/callbacks,
  staging, deployment, release workflow, or release hardening.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Standalone task with no epic | The current happy-path epic explicitly excludes real provider integration. |
| Existing three Admin APIs remain | They already express public bootstrap history and authoritative current Admin outcomes without exposing Better Auth state. |
| Better Auth React client stays in the Admin slice | Provider mechanics are browser-application details and there is no evidence for a generic frontend auth layer. |
| Fixed application destinations | `/admin` satisfies context continuation and prevents open redirect input. |
| Sanitized same-origin failure redirect | It gives localized recovery without exposing raw provider callback payloads. |
| Explicit linking disablement | It enforces the accepted distinct-principal v1 policy instead of relying on defaults. |

## Phases

### Phase 1: Authentication Composition And Boundaries

- [x] Add environment-owned Google provider composition and explicit
      no-linking options.
- [x] Add focused configuration and authorization-URL boundary evidence.
- [x] Add the exact `better-auth/react` browser permission and synchronize the
      canonical boundary documentation.

**Checkpoint**: Google initiation constructs the expected callback from safe
test values, and booking code remains free of provider concepts.

### Phase 2: Admin Browser State Flow

- [x] Add fixed Google sign-in, sanitized failure, and Better Auth sign-out.
- [x] Gate the bootstrap name form behind authentication.
- [x] Render Active, no-Admin, Disabled, and unauthenticated states with German
      localized copy and recovery actions.

**Checkpoint**: `/admin` implements the intended first-bootstrap and normal
login state machines without changing domain invariants or API representations.

### Phase 3: Local Configuration And Regression Evidence

- [x] Pin normal Vite development to `localhost:5173` with strict port.
- [x] Preserve safe fixture composition and real-credential-free CI.
- [x] Expand Worker and Playwright coverage for all required states and sign-out.

**Checkpoint**: deterministic tests cover the slice without external OAuth UI.

### Phase 4: Documentation, Verification, And Completion

- [x] Update setup, architecture status/authentication/browser/boundary docs,
      verification/release language, indexes only where routing changes, and
      applicable co-located docs.
- [x] Run `pnpm check`, Markplane sync/check, and credential-content checks.
- [x] Complete the task and plan, then commit with the task ID.

**Checkpoint**: implementation, enforcement, documentation, planning state,
and verified repository state agree.

## Testing Strategy

- Worker configuration test: exact Google provider values, linking flags,
  opaque session settings, and missing-secret refusal.
- Worker HTTP test: social sign-in returns a Google authorization URL whose
  redirect URI is the single Better Auth callback and whose application
  callback is controlled by the request issued by the browser adapter.
- Existing Worker tests: Admin state distinctions, bootstrap invariants, and
  production fixture structural exclusion remain green.
- Playwright: unauthenticated fresh/login entries, authenticated bootstrap form,
  exactly-one bootstrap, Active/missing/Disabled states where cleanly
  exercisable, and session termination through sign-out.
- Full canonical `pnpm check` with no real provider secret available to CI.

## Implementation Evidence

- Better Auth normal composition receives all credentials from the Worker
  environment, configures Google, disables both implicit and manual linking,
  and fails closed when required values are missing.
- Worker tests prove the Google authorization boundary uses
  `/api/auth/callback/google`, rejects an external application destination,
  and sanitizes provider callback failure payloads.
- Chromium proves unauthenticated first registration has no name form, the
  fixed Google initiation body, fixture-authenticated bootstrap, Active Admin
  return, missing-Admin refusal, and sign-out session termination.
- The explicit boundary map permits only `better-auth/react` from browser
  source; canonical boundary documentation matches it.
- Build and automated-test commands exclude the ignored local `.env`; a final
  value-based scan found no real local provider value in tracked files, Git
  history, or generated artifacts.
- On 2026-08-27, the canonical `pnpm check` passed all 21 repository-tooling,
  8 domain, 17 Worker/D1, production-build, and Chromium-E2E surfaces.

## Rollback Plan

Revert the task commit. The change adds no booking schema migration and does
not alter existing Admin rows or bootstrap history. Existing fixture sessions
remain independently composed throughout.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `TASK-t65sy`
- `TASK-aeij8`
- `PLAN-92d7i`
- `EPIC-m22qh`
