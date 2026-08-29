---
id: PLAN-6g26a
title: Implementation plan for Join Courses through shared Invites
status: done
implements:
- TASK-5gny6
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Shared Course Invite Join Implementation Plan

## Overview

Complete the shared Course Invite flow from initial public recognition through
fixed-destination Google authentication, optional Participant onboarding, and
a separate explicit Join. Initial recognition replaces raw fragment authority
with a signed same-origin `HttpOnly` session cookie containing only the
Invite's SHA-256 digest. Authentication and onboarding therefore carry no raw
token and create no membership or pending booking-domain row.

Join uses one body-free authenticated request. The Worker verifies the signed
continuation, resolves the current Active Participant, and atomically rechecks
the current enabled Invite, Active Course, Participant, and retained Assignment
in D1. A missing Assignment is created once, Active is an idempotent success,
and Revoked is never reactivated.

## Ground Truth

- `.markplane/backlog/items/TASK-5gny6.md` — continuation, explicit Join,
  acceptance-time revalidation, privacy, and required evidence.
- `docs/product/course-access.md#participant-registration-and-onboarding` and
  `#join-flow` — authentication/onboarding do not Join; missing/Active/Revoked
  Assignment and stale-state rules.
- `docs/product/course-access.md#recognized-invite-visibility` and scenarios
  H/I/J — Course-name-only pre-Join visibility, forwarding, repeat, and revoked
  refusal.
- `docs/architecture/authentication-and-sessions.md#invite-continuation` —
  fixed application continuation, no OAuth token leakage, and fresh Join.
- `apps/booking-system-web/src/worker/course-access/createCourseInviteHttpHandler.js`
  and `createCourseInvitePersistence.js` — implemented digest recognition,
  no-store boundary, and current/predecessor storage.
- `apps/booking-system-web/src/worker/course-access/createCourseAssignmentPersistence.js`
  — one Assignment pair, guarded insert, exact classification, and retained
  Revoked state.
- `apps/booking-system-web/src/browser/participant-entry/*` — fixed Google
  entry, current Participant gate, explicit onboarding form, and query state.
- `apps/booking-system-web/src/authentication/createAuthentication.worker.test.js`
  — pinned Better Auth 1.7.2 origin-checked fixed callback evidence without
  contacting Google.
- `apps/booking-system-web/src/browser/course-access/CourseInvitePage.jsx` and
  `useCourseInvites.js` — current fragment capture, public recognition, and
  minimal German route.
- `docs/process/verification.md` — domain, Worker/D1, auth, build, Chromium,
  focus, responsive, privacy, and axe ownership.

No adjacent `*.docs.md` exists for the inspected authentication, Invite,
Assignment, Participant-entry, or browser composition source.

## Approach

1. Add a focused booking `course-access` Join operation:
   - accept a current Active Participant, recognized internal Invite context,
     and current Assignment snapshot;
   - reuse an existing Assignment identity or generate a candidate only when
     missing, but always delegate acceptance so a stale snapshot cannot win;
   - map guarded persistence outcomes to `joined`, `already-joined`,
     `participant-not-active`, `invite-not-joinable`, or
     `assignment-revoked`; and
   - never reactivate, expire, consume, or personalize an Invite.
2. Extend existing application-private persistence without a migration:
   - expose pair lookup from Assignment persistence;
   - use `insert ... select` plus `on conflict do nothing` to require the exact
     digest's current enabled Invite, Active Course, and Active Participant;
   - classify the retained pair after every no-op/constraint race, treating
     Active as idempotent and Revoked as refusal; and
   - return only the accepted Assignment and minimal Course identity/name.
3. Replace browser-held continuation after recognition with a signed cookie:
   - HMAC-SHA-256 a versioned digest payload through Worker Web Crypto using
     the environment-owned Better Auth secret as key material;
   - emit `booking_course_invite_continuation` with `HttpOnly`,
     `SameSite=Lax`, `Path=/`, session lifetime, and `Secure` on HTTPS;
   - verify with `crypto.subtle.verify`, reject malformed/tampered values, and
     clear a prior cookie on unknown/malformed initial recognition;
   - set it only after an available recognized raw token, then remove the raw
     token from Invite `sessionStorage`; and
   - keep raw token, digest, signature, and cookie out of response bodies,
     OAuth destinations, provider URLs, diagnostics, and analytics.
4. Extend the focused Invite HTTP boundary:
   - retain `POST /api/course-invites/recognition` for first fragment input and
     establish the cookie on available recognition;
   - add public `GET /api/course-invites/continuation`, resolving the signed
     digest to the same Course-name-only available/unavailable result;
   - add authenticated body-free `POST /api/course-invites/join`, deriving
     Participant, digest, Course, Invite, and Assignment server-side;
   - return `201 joined` or `200 already-joined` with only Assignment id/state
     and Course id/name; use exact unauthenticated/missing/Disabled/Revoked/
     stale/unavailable outcomes and sanitized `500`; and
   - keep every Invite response `no-store` and compose signing plus Assignment
     persistence in production/non-production Workers.
5. Complete the `/invite` browser journey:
   - initial fragment recognition establishes continuation and erases raw
     session storage; later refresh/OAuth/onboarding return uses only GET
     continuation;
   - recognize before mounting any Participant query, then show a fixed
     `/invite` Google action, existing explicit onboarding form, or Active-
     Participant Join confirmation as current state requires;
   - add fixed `/api/auth/invite-error -> /invite?authentication=failed`
     sanitization, with callback `/invite` and no caller-selected destination;
   - show focused German sign-in/onboarding/confirmation/joined/already-joined/
     Revoked/unavailable/technical states, plus an explicit post-success link
     to the now-private Course; and
   - keep public Course name separate from private Course queries until Join
     succeeds.
6. Update canonical status, application/authentication/browser/persistence/
   package/module/boundary/runtime/verification docs and dictionary wording
   from deferred continuation/Join to implemented behavior.

## Non-Goals / Out of Scope

- Admin direct Assignment changes (`TASK-z6hut`) or Admin-assisted Module
  Selection (`TASK-2nh3b`).
- Admin Invites/onboarding (`TASK-wny83`, `TASK-rrp92`), generic invitation or
  continuation abstractions, public Course discovery, person-specific Invite
  state, expiry, automatic Join, or Participant self-reactivation.
- Provider UI automation, another session library, an Invite-continuation D1
  table/pending domain row, remote analytics, or new encryption/key services.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Signed digest session cookie | Crosses OAuth/onboarding without raw token or pending data; HMAC prevents browser tampering. |
| Existing Better Auth secret with versioned HMAC purpose | Environment-owned high-entropy key already required by both Worker compositions; no new deployment secret surface. |
| Session lifetime, no product expiry | Browser continuation ends with the browser session while the Course Invite itself keeps its accepted no-expiry contract. |
| `SameSite=Lax`, `HttpOnly`, HTTPS `Secure`, root path | Survives the top-level provider callback, is unavailable to JavaScript, and reaches Invite/auth API paths. |
| Digest relookup plus body-free Join | Raw authority is unnecessary after recognition and no client state is trusted at acceptance. |
| Guarded insert without conflict update | Active repeat is idempotent while a retained Revoked row cannot self-reactivate. |
| No migration | Signed cookie carries technical continuation; existing Invite and Assignment schemas already own durable truth. |

## Phases

### Phase 1: Domain And Atomic Join

- [x] Add/export Join domain operation and missing/Active/Revoked/stale matrices.
- [x] Add pair lookup plus guarded digest-based Assignment insert/classification.
- [x] Prove concurrent/repeated/two-Participant and all current-state races.

**Checkpoint**: Exactly one normal Assignment is created or retained, and
Revoked membership never changes.

### Phase 2: Signed Continuation And HTTP

- [x] Add versioned HMAC cookie issue/verify/clear with tamper/attribute tests.
- [x] Add initial recognition, continuation read, and body-free Join routes.
- [x] Compose runtime secret/Assignment capabilities and fixed Invite auth error.
- [x] Prove OAuth destinations and all public/private representation boundaries.

**Checkpoint**: Raw authority ends after first recognition and fixed
authentication/onboarding can return to one revalidatable Invite flow.

### Phase 3: German Browser Journey

- [x] Recompose `/invite` around continuation then Participant state.
- [x] Reuse explicit onboarding mechanics and add fixed Invite Google entry.
- [x] Add accessible explicit Join confirmation, success/repeat/refusal states.
- [x] Prove new/existing/two-Participant/repeat and bounded stale/privacy flows.

**Checkpoint**: No identity or membership appears before explicit Join, and
private Course access appears only after success.

### Phase 4: Documentation And Completion

- [x] Update canonical global docs, dictionary, status, and routing indexes.
- [x] Run focused suites and one uninterrupted final `pnpm check`.
- [x] Complete task/plan, sync/check Markplane, and make one semantic commit.

**Checkpoint**: Product truth, code, security boundaries, evidence, tracking,
and history agree.

## Testing Strategy

- Booking-domain Vitest owns policy/outcome translation and no side effects.
- Worker/D1 Vitest owns guarded current-state acceptance, concurrency,
  continuation HMAC/cookies, auth composition, HTTP privacy, and sanitization.
- Playwright owns real continuation around fixed sessions/onboarding, two-person
  reuse, repeat, every critical refusal, refresh, desktop/360px, keyboard/
  focus, overflow, privacy probes, and axe.
- `pnpm check` is the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No schema rollback exists. Existing Course Invite
and Assignment rows remain valid; reverting removes only Join/continuation
behavior and restores recognition-only `/invite` presentation.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is below the repository's 300-line source split threshold

## References

- `TASK-5gny6`
- `TASK-k2ckf`
- `TASK-rrp92`
- `docs/product/course-access.md`
- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/applications.md`
- `docs/process/verification.md`
