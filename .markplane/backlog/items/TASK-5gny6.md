---
id: TASK-5gny6
title: Join Courses through shared Invites
status: done
priority: medium
type: feature
effort: large
epic: EPIC-ziadc
plan: PLAN-6g26a
depends_on:
- TASK-k2ckf
- TASK-7uxjj
- TASK-smtvk
- TASK-fzniz
blocks:
- TASK-h37zt
related:
- TASK-rrp92
assignee: gerkules
tags:
- course-invite
- participant
- onboarding
- security
position: f20
created: 2026-08-27
updated: 2026-08-29
---

# Join Courses through shared Invites

## Description

Let a person safely continue from a recognized shared Course Invite through
Google authentication and, if necessary, Participant onboarding, then make a
separate explicit Join decision. Invite possession never creates identity or
membership by itself; acceptance revalidates every current state and creates
or preserves exactly one ordinary Course Assignment.

## Acceptance Criteria

- [x] A recognized Invite can continue across unauthenticated entry and
      Participant onboarding without accepting Join, creating an Assignment,
      or creating a pending domain record.
- [x] Continuation uses an application-owned server/session mechanism so the
      raw Invite secret never enters Google OAuth URLs, callback parameters,
      referrers, browser/technical logs, analytics, or unrelated responses.
- [x] After authentication/onboarding, an Active Participant sees Course name
      and an explicit German Join confirmation; current Invite, Course,
      Participant, and Assignment state is revalidated only when accepted.
- [x] A valid enabled current Invite for an Active Course creates one Active
      Assignment when missing. Repeating Join with an already-Active Assignment
      is an idempotent successful no-op with no duplicate.
- [x] Join is refused without membership change for Disabled Participants,
      Revoked Assignments, disabled/replaced Invites, Archived Courses, unknown
      tokens, or stale pages. Invite possession cannot self-reactivate a
      Revoked Assignment.
- [x] The same link may be forwarded and accepted independently by several
      Active Participants, with one Assignment per Participant/Course.
- [x] Success grants only normal assigned-Course access. Before success and on
      refusal, no Course-private data beyond the recognized-token Course-name
      exception is exposed.

## UI/UX Expectations

The public Invite, Google continuation, onboarding return, explicit Join, and
outcome views are directly navigable/refresh-safe where appropriate and use
German-first MUI states. Confirmation states clearly distinguish sign-in,
registration, and Join; focus never jumps into private Course content before
acceptance. Unavailable/replaced/Revoked/Archived outcomes have safe recovery,
responsive layout, keyboard/dialog focus, and non-color-only meaning.

## Verification Evidence Required

- Booking-domain Vitest for missing/Active/Revoked Assignment outcomes,
  idempotence, state refusals, and one-per-Course membership.
- Worker/D1 tests for atomic Join, current-state races, concurrent/repeated
  acceptance, no partial Assignment, and Invite-secret continuation/logging
  boundaries.
- Authentication structural tests proving fixed same-origin continuation and
  production fixture exclusion; routine tests never contact Google's UI.
- Playwright with fixed Participants for new onboarding continuation, existing
  Participant Join, reuse by two Participants, repeat no-op, every critical
  stale/refusal/privacy case, refresh, mobile/desktop, keyboard/focus, and axe.
- Full `pnpm check`.

## Out Of Scope / Notes

Admin direct assignment remains `TASK-z6hut`; Admin-assisted Assignment is
`TASK-2nh3b`. Do not add public discovery, person-specific Invite state,
automatic Join, expiry, or Participant self-reactivation. Create a fresh
implementation plan when selected.

## References

- `docs/product/course-access.md#join-flow`
- `docs/product/course-access.md#reuse-and-forwarding`
- `docs/product/course-access.md#recognized-invite-visibility`
- `docs/product/representative-scenarios.md#b-course-invite-continues-through-onboarding`
- `docs/product/representative-scenarios.md#h-shared-invite-and-minimal-visibility`
- `docs/product/representative-scenarios.md#i-recognized-unusable-course-invite`
- `docs/product/representative-scenarios.md#j-repeated-and-revoked-invite-use`
- `docs/product/representative-scenarios.md#ah-stale-actions-lose-to-current-state`
- `docs/architecture/authentication-and-sessions.md#invite-continuation`
- `docs/process/verification.md#browser-tests`
