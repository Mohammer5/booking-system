---
id: PLAN-5inhn
title: Implementation plan for Complete invited Admin onboarding
status: done
implements:
- TASK-rrp92
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Invited Admin Onboarding Implementation Plan

## Overview

Complete the public half of the one-time Admin Invite lifecycle without
changing the administration behavior delivered by `TASK-wny83`. A raw fragment
token is recognized once and replaced by a signed, Admin-Invite-specific
`HttpOnly` digest continuation. Authentication returns to the fixed
`/admin/invite` route but consumes nothing. Only a separate authenticated name
submission atomically changes one Active Invite to Claimed and inserts one new
ordinary Active Admin User.

The existing `admin-access` package module owns recognition and onboarding
policy. The application keeps its browser, HTTP, D1, Web Crypto, Better Auth,
and fixed-fixture mechanics private. No new migration is required: the
digest-only `0008_admin_invites.sql` schema already supports recognition and
the terminal `Active -> Claimed` transition. Its migration evidence will be
extended to cover the claim path.

## Ground Truth

- `.markplane/backlog/items/TASK-rrp92.md` — public privacy, safe continuation,
  explicit name, atomic claim, current/deleted principal policy, competition,
  UI, and evidence requirements.
- `docs/product/admin-access.md#admin-invites` — canonical availability,
  onboarding, ordinary authority, existing/deleted principal, and terminal
  lifecycle policy.
- `docs/product/representative-scenarios.md#aa-admin-invite-claim` through
  `#ae-concurrent-admin-invite-claim` — accepted success, refusal, return, and
  competition journeys.
- `docs/architecture/authentication-and-sessions.md#invite-continuation` —
  fixed same-origin return, server-backed continuation, and raw-secret
  exclusion.
- `packages/booking/src/admin-access/createBootstrapFirstAdmin.js` — explicit
  nonblank Admin-name validation and plain candidate/result conventions.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql` and
  `0008_admin_invites.sql` — unique external principal, ordinary/Admin states,
  digest-only authority, and terminal transition constraints.
- `apps/booking-system-web/src/worker/admin-bootstrap/createAdminPersistence.js`
  — D1 `batch()` rollback pattern for coupled Admin creation.
- `apps/booking-system-web/src/worker/course-access/createCourseInviteContinuation.js`
  and `createCourseInviteJoinHttpHandler.js` — verified purpose-derived signed
  digest cookie and raw-fragment recognition pattern; Admin continuation stays
  separately named and purpose-derived.
- `apps/booking-system-web/src/browser/course-access/CourseInvitePage.jsx` and
  `useCourseInvites.js` — fragment capture, address cleanup, continuation,
  refresh, and focused public-state conventions.
- `apps/booking-system-web/src/browser/admin-bootstrap/*` — Admin Google,
  current-context, explicit-name, sign-out, and German MUI conventions.
- `apps/booking-system-web/src/authentication/fixture-session/*` — fixed normal
  non-production sessions with production structural exclusion.
- `docs/process/verification.md` — layered domain, Worker/D1, authentication,
  browser, responsive, focus, privacy, and axe evidence.

No adjacent `*.docs.md` exists for the inspected Admin domain, authentication,
browser, Worker, composition, or migration source.

## Approach

1. Add focused `admin-access` domain operations:
   - recognize only an Active Admin Invite as `{ outcome: "available" }`;
   - collapse missing, Claimed, Revoked, and unusable state to one unavailable
     outcome without returning creator, Admin, Course, or other Invite data;
   - validate the explicit Admin name before persistence;
   - refuse any current Active or Disabled Admin for the principal;
   - create a fresh candidate with a generated identity, Active state, and
     ordinary `admin` authority only; and
   - delegate final acceptance to guarded atomic persistence, translating
     stale Invite/principal outcomes without pending state.
2. Extend Admin Invite persistence:
   - find one Invite by SHA-256 digest for public recognition without exposing
     digest or creator data upward;
   - atomically claim by first updating exactly one Active Invite only when no
     Admin currently has the external principal, then inserting the candidate
     only when SQLite `changes()` reports that exact update won;
   - use one D1 `batch()` so any candidate uniqueness/integrity failure rolls
     the terminal update back;
   - classify an existing Active/Disabled Admin and missing/terminal Invite
     after a zero-change batch while revealing neither state publicly; and
   - prove same-Invite and same-principal concurrency, deletion/re-entry, and
     no partial Admin or Invite state.
3. Add Admin-specific continuation and public HTTP:
   - use a separate `booking_admin_invite_continuation` session cookie and
     purpose-derived HMAC key over the stored digest;
   - add `POST /api/admin-invite/recognition`, `GET
     /api/admin-invite/continuation`, and authenticated `POST
     /api/admin-invite/claim`;
   - initial recognition accepts a 64-hex raw token body, hashes it, and issues
     a signed digest cookie only for an Active Invite;
   - continuation reads only the signed cookie and rechecks current Invite
     state; unavailable input shares one `404 invite-unavailable` response;
   - claim derives the external principal from the normal session, accepts
     only `{ name }`, re-resolves current Admin and Invite state, and invokes
     guarded persistence;
   - success returns narrow ordinary Active Admin metadata, clears the
     continuation, and uses `no-store`; invalid name, existing Admin, stale
     Invite, unauthenticated, and technical paths contain no secret; and
   - add `/api/auth/admin-invite-error` as one sanitized fixed failure redirect
     to `/admin/invite`.
4. Add the directly navigable `/admin/invite` browser flow:
   - capture `#token` into one Admin-Invite-specific `sessionStorage` key,
     immediately clean the address bar, recognize it, then erase the raw value
     after available or definitively unavailable recognition;
   - show German loading, common unavailable, and sanitized technical states
     before mounting authentication or name UI;
   - for an available continuation, resolve current Admin state: unauthenticated
     gets fixed Google continuation, no Admin gets the explicit required-name
     form, and current Active/Disabled Admin gets a common refusal without
     claim;
   - preserve continuation across refresh, Google return, local validation,
     and abandonment without consuming the Invite;
   - show a focused success result and administration link only after atomic
     creation, and focused stale/concurrent/existing/technical outcomes; and
   - provide sign-out where an authenticated principal cannot proceed.
5. Extend deterministic authentication fixtures only for the independent
   prospective Admin principals needed by real browser competition. Fixture
   routes create normal Better Auth sessions only and remain structurally
   absent from production; no fixture creates or mutates a booking identity.
6. Update canonical product status, architecture/application/authentication/
   persistence/browser/runtime/verification docs, dictionary coverage, and
   routing indexes from deferred Admin onboarding to implemented behavior.

## Non-Goals / Out Of Scope

- Admin User list/edit/promotion/lifecycle (`TASK-45jmb`, `TASK-qhred`, and
  `TASK-ikzih`).
- Super Admin invitation, direct promotion, pending Admin state, passwords,
  account linking, name/email identity matching, expiry, Invite reuse,
  deletion, reactivation, recovery, or email delivery.
- Participant creation, Course Assignment creation, or Course Invite reuse.
- A shared generic Invite continuation/token framework, a new workspace, a
  boundary-map change, or rewriting an already accepted migration.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Separate Admin continuation cookie and HMAC purpose | Course and Admin Invites have distinct authority, lifecycle, and consumers even though the verified cryptographic pattern is analogous. |
| Reuse migration `0008` without schema growth | Stable identity, digest, and Active/Claimed/Revoked already express every required durable fact; claimant/audit metadata is not a product requirement. |
| Claim update followed by `changes()`-guarded insert in one D1 batch | A losing Invite/principal guard inserts nothing, while an insert failure rolls back the terminal update; no pending row or generic transaction service is needed. |
| Reuse `/api/admin/me` for browser context | It already resolves the authenticated principal against current Admin state and avoids a second session or role endpoint. |
| Common public unavailable response | Unknown and terminal Invites must not expose administrative state or creator details. |
| Fixed non-production prospective principals | Real competing-session E2E remains deterministic without arbitrary impersonation or production fixture reachability. |

## Phases

### Phase 1: Domain And Atomic Persistence

- [x] Add/export recognition and invited-onboarding operations with complete
      name, authority, current/deleted principal, and terminal matrices.
- [x] Add digest lookup and atomic claim persistence using existing schema.
- [x] Extend migration/D1 evidence for terminal claim, rollback, concurrency,
      same-principal competition, and deleted-principal new identity.

**Checkpoint**: Exactly one valid completion creates one ordinary Active Admin
and claims one Invite; every loser changes neither side.

### Phase 2: Secret-Safe Continuation And HTTP

- [x] Add Admin-specific signed digest continuation and tamper/cookie tests.
- [x] Add exact recognition/continuation/claim HTTP contracts and composition.
- [x] Extend fixed auth destinations, production exclusion, privacy scans, and
      sanitized failure evidence.

**Checkpoint**: Raw authority leaves the browser only in initial recognition,
never reaches OAuth, and every later decision rechecks the digest and session.

### Phase 3: German Public Onboarding

- [x] Add `/admin/invite`, fragment cleanup, continuation, current-context,
      Google, name, sign-out, unavailable, and success states.
- [x] Add isolated fixed prospective-Admin identities to non-production auth.
- [x] Prove refresh/abandonment, invalid name, real creation, existing/Disabled
      refusal, deleted return, competition, responsive layout, focus, and axe.

**Checkpoint**: The complete public journey is accessible and truthful while
opening, authenticating, refreshing, or abandoning consumes nothing.

### Phase 4: Documentation And Completion

- [x] Update canonical docs/status/indexes and complete dictionary coverage.
- [x] Run focused suites and one uninterrupted final `pnpm check`.
- [x] Complete task/plan, sync/check Markplane, and make one semantic commit.

**Checkpoint**: Product truth, architecture, implementation, evidence,
tracking, and history agree before `TASK-45jmb` begins.

## Testing Strategy

- Booking-domain Vitest owns recognition privacy, name validation, ordinary
  authority, current/Disabled/deleted principal policy, and persistence outcome
  translation.
- Worker/D1 Vitest owns existing-schema migration support, signed digest
  continuation, lookup privacy, atomic update+insert, same-Invite/same-principal
  races, rollback, deleted return, exact HTTP, fresh session/Invite state,
  production composition, and secret/error scans.
- Authentication tests own fixed `/admin/invite` Google success/error
  destinations and prove no token enters provider authorization URLs.
- Playwright owns raw-fragment cleanup, authentication initiation payload,
  refresh and abandonment, required/invalid name, real success, existing and
  Disabled refusal without consumption, deleted return presentation, two
  competing fixed principals, common unavailable states, desktop/360px,
  keyboard/focus/overflow, and axe without automating Google's hosted UI.
- `pnpm check` is the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No schema migration is added or rewritten; existing
Active/Revoked Admin Invites and already accepted Admin Users retain their
prior meaning. A successfully Claimed Invite remains terminal product data if
the feature has already been used in a deployed environment.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is below the repository's 300-line source split threshold

## References

- `TASK-rrp92`
- `TASK-wny83`
- `docs/product/admin-access.md`
- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/applications.md`
- `docs/process/verification.md`
