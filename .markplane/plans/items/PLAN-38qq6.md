---
id: PLAN-38qq6
title: Implementation plan for Manage shared Course Invites
status: done
implements:
- TASK-k2ckf
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Shared Course Invite Management Implementation Plan

## Overview

Implement one current shared Course Invite per Course inside the existing
`course-access` responsibility. Active Admin Users can create, retrieve, copy,
disable, re-enable, and replace the current Invite only while its Course is
Active. Replacement retains a one-way lookup digest for predecessor
recognition while atomically clearing its recoverable secret and installing a
new enabled current Invite.

The public `/invite` route will recognize an opaque token without mounting an
Admin or Participant context. It returns only Course name and available/
unavailable meaning; Join, authentication continuation, and Assignment writes
remain deferred to `TASK-5gny6`. The copied URL uses a fragment
(`/invite#<token>`), so the raw token does not enter HTTP paths, query strings,
server access logs, or referrers. The browser moves it immediately into
Invite-specific `sessionStorage`, cleans the address bar with `replaceState`,
and sends it only in the body of a no-store recognition request.

## Ground Truth

- `.markplane/backlog/items/TASK-k2ckf.md` — one-current lifecycle, public
  recognition/privacy, concurrency, secret handling, and required evidence.
- `docs/product/course-access.md#shared-course-invite` — exact lifecycle,
  reusable current URL, recognized predecessor visibility, and authoritative
  current-state rule.
- `docs/product/domain-model.md#course-invite` and
  `docs/product/_decisions.md#use-one-shared-reusable-course-invite` — stable
  Course ownership, no person/expiry model, and minimal Course-name exposure.
- `docs/product/non-goals.md#invitations-and-accounts` — no person-specific,
  automatic-expiry, multiple-current, or pending-identity behavior.
- `docs/architecture/authentication-and-sessions.md#invite-continuation` —
  opening/recognition does not authenticate or Join; secrets stay out of OAuth,
  referrers, logs, and analytics.
- `docs/architecture/browser-conventions.md#diagnostic-logging` — raw Course
  Invite tokens are prohibited diagnostic data.
- `packages/booking/src/course-access/createAssignParticipantToCourse.js` —
  narrow operation factories, generated identity injection, and guarded
  persistence-outcome translation.
- `apps/booking-system-web/src/worker/course-access/createCourseAccessHttpHandler.js`
  and `courseAccessHttpContract.js` — existing Admin authorization, nested
  Course resource, exact route/result, and sanitization patterns.
- `apps/booking-system-web/src/worker/course-access/createCourseAssignmentPersistence.js`
  — guarded current-state D1 operations and `D1Database.batch()` rollback.
- `apps/booking-system-web/migrations/0002_courses.sql` through
  `0006_module_selections.sql` — stable text identity, constrained state,
  restrictive ownership, trigger, and additive migration conventions.
- `apps/booking-system-web/src/browser/course-structure/CourseDetailPage.jsx`
  and `browser/BrowserApplication.jsx` — stable Admin Course composition and
  language-independent route ownership.
- `docs/process/verification.md` — layered domain, Worker/D1, production build,
  Chromium, responsive, focus, privacy, and artifact policy.

No adjacent `*.docs.md` exists for the inspected Course-access source,
migrations, composition files, or browser routes.

## Approach

1. Add focused booking-domain operations in `course-access`:
   - create the first enabled Invite only for an Active Admin, Active Course,
     and no current Invite;
   - disable only an enabled current Invite, re-enable only a disabled current
     Invite, and replace either current state with a generated enabled Invite;
   - accept injected Invite-ID/token factories and narrow guarded persistence
     capabilities, with no clock or expiration input; and
   - derive recognition as `available` only for the current enabled Invite in
     an Active Course, otherwise `unavailable`, exposing Course name only.
2. Add migration `0007_course_invites.sql` and one persistence adapter:
   - store stable Invite/Course identity, unique SHA-256 token digest,
     current/enabled flags, current-only recoverable token, and a unique
     replacement marker; enforce at most one current Invite per Course;
   - generate 32 cryptographically random bytes as 64 lowercase hex characters
     (256 bits), and hash raw tokens through Worker Web Crypto before lookup;
   - create/enable/disable with guarded SQL rechecking Active Admin/Course and
     exact current Invite/state;
   - replace in one D1 batch: guard/update the expected current predecessor,
     clear its raw token, attach the new unique replacement marker, then insert
     the new current row only through that marker. Any stale, constraint,
     trigger, or concurrent loss rolls back both statements; and
   - recognize current or predecessor digests across Active/Archived Courses
     without returning another Invite, raw token, digest, Course details, or
     private relationship data.
3. Add a separate focused Course-Invite HTTP handler within Worker
   `course-access`:
   - Admin `GET/POST /api/admin/courses/:courseId/invites/current` plus body-free
     `POST .../:inviteId/disablement`, `/reenablement`, and `/replacement`;
   - unauthenticated `POST /api/course-invites/recognition` with `{ token }`,
     one private unknown/malformed `404 invite-unavailable`, and recognized
     `200 { outcome, courseName }`;
   - current Admin responses contain only Invite `id`, enabled/disabled state,
     and the related fragment URL; public responses never contain URL/token;
   - apply `cache-control: no-store`, accept no actor/Course/state/token-digest
     trust fields, and sanitize every technical error; and
   - compose token/ID generation, hashing, D1 persistence, production and
     non-production Workers without adding a dependency or logging path.
4. Add German MUI presentation in browser `course-access`:
   - mount an Invite section only on Active Admin Course detail with exact
     loading, no-Invite, enabled, disabled, copied, stale, and error states;
   - expose create, semantic copy, re-enable, destructive disable Dialog, and
     permanent replacement Dialog; focus safe cancellation first, restore it
     on dismissal, and focus result/errors after actions;
   - add `/invite` outside Participant/Admin gates, read a fragment token once,
     store it only under an Invite-specific session key, immediately clean the
     URL, and POST for recognition so direct refresh works without public
     discovery; and
   - present only Course name plus non-color-only available/unavailable state,
     with generic unknown/malformed output and no Join control yet.
5. Verify and document:
   - domain matrices for every valid/invalid transition, repeat/stale state,
     generated identity/token propagation, no expiry, and recognition privacy;
   - migration/D1/HTTP evidence for clean/upgrade state, constraints, raw-
     current/digest-predecessor storage, exact lookup, concurrent create/
     replacement, archive races/refusals, production authorization, no-store,
     narrow results, and secret-safe failures;
   - Playwright real create/retrieve/copy/disable/re-enable/replace and old/new/
     archived/unknown public states with cleanup, session refresh, privacy
     probes, keyboard/Dialog/result focus, desktop/360px, overflow, and axe;
     and
   - update canonical status, application/HTTP, persistence, authentication,
     browser, package/module/boundary, verification, dictionary, and indexes.

## Non-Goals / Out of Scope

- Join confirmation, authentication/onboarding continuation, Assignment
  creation, repeat Join, or Revoked-Assignment handling (`TASK-5gny6`).
- Person/email-specific Invites, expiry, multiple current Invites, public
  Course discovery, Invite deletion, analytics, remote key management, or
  general secret-vault/observability infrastructure.
- Admin Invites (`TASK-wny83` onward), a new package/first-level responsibility,
  boundary-map permission, dependency, or generic token/Invite abstraction.

## Security Review And Key Decisions

| Decision | Rationale |
|----------|-----------|
| 256-bit hex token from Worker Web Crypto | URL-safe high entropy without a dependency or biased encoding. |
| SHA-256 digest for all recognition lookups | Raw predecessors are irrecoverable but remain recognizable. |
| Raw token retained only for current Invite | Product requires later current-URL retrieval; replacement removes predecessor authority atomically. |
| Fragment URL plus immediate session storage and cleanup | Fragments avoid HTTP/referrer/server-log exposure; related session state preserves refresh. |
| POST-body recognition with no-store responses | Token is absent from URL/cache and public output stays narrow. |
| Replacement marker inside one D1 batch | The insert is causally tied to the exact guarded predecessor update. |
| No encryption/key service in this task | Recoverability needs plaintext somewhere; adding unowned rotation/key infrastructure would expand scope without an accepted contract. |

## Phases

### Phase 1: Domain Lifecycle And Secret-Safe Persistence

- [x] Add operation factories, public exports, lifecycle/recognition tests, and
      256-bit token/hash adapters.
- [x] Add migration 0007, clean/data-preserving upgrade tests, constraints, and
      current/predecessor storage evidence.
- [x] Add guarded create/state/replacement/lookup persistence with exact
      concurrency, archive-race, and rollback tests.

**Checkpoint**: One current Invite is recoverable; predecessors retain only
recognition digests, and every stale or concurrent loser leaves coherent state.

### Phase 2: HTTP And Public Recognition

- [x] Add exact Admin/public routes, authorization split, no-store narrow
      representations, fragment URL construction, and sanitization.
- [x] Compose production/non-production crypto/ID/persistence capabilities.
- [x] Prove recognized/current/predecessor/disabled/Archived and unknown/
      malformed privacy plus raw-secret exclusion from unrelated responses.

**Checkpoint**: The public boundary reveals only Course name and availability,
and Admin URL retrieval is confined to Active-Course management.

### Phase 3: German Admin And Public Browser Journeys

- [x] Add Invite queries/mutations, Admin state/action section, copy result,
      and destructive Dialog focus behavior.
- [x] Add fragment/session-backed `/invite` recognition with immediate URL
      cleanup and no Participant/Admin context query.
- [x] Add real and bounded Playwright journeys for lifecycle, predecessor/
      Archived recognition, unknown privacy, refresh, responsive, focus, and axe.

**Checkpoint**: Admin management is complete and the minimal public route is
refresh-safe without exposing private Course context or implementing Join.

### Phase 4: Documentation, Verification, And Completion

- [x] Update canonical global docs, dictionary coverage, and routed indexes.
- [x] Run focused suites and one uninterrupted final `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-k2ckf`.

**Checkpoint**: Product, security model, code, evidence, docs, tracking, and
history agree on one reusable current Invite and minimal recognition.

## Testing Strategy

- Booking-domain Vitest owns lifecycle/visibility rules and absence of time,
  identity, membership, or unrelated-data side effects.
- Worker/D1 Vitest owns migration, token storage/lookup, guarded atomicity,
  concurrency, authorization, archive interaction, HTTP privacy, and crypto
  composition.
- Playwright owns copy and German state transitions, raw-fragment cleanup,
  public minimal visibility, direct/session refresh, desktop/360px, keyboard/
  Dialog/result focus, overflow, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit before remote deployment. Migration 0007 is additive;
local/test databases may be rebuilt. If already deployed, do not drop Invite
history automatically—forward-fix the feature while preserving recognized
predecessor digests and current URL authority.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is below the repository's 300-line source split threshold

## References

- `TASK-k2ckf`
- `TASK-5gny6`
- `docs/product/course-access.md`
- `docs/product/domain-model.md`
- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/architecture/browser-conventions.md`
- `docs/process/verification.md`
