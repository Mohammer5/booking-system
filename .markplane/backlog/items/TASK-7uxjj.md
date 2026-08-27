---
id: TASK-7uxjj
title: Register Participants
status: in-progress
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: PLAN-n8a29
depends_on:
- TASK-aeij8
- TASK-dfq2k
blocks:
- TASK-z6hut
- TASK-5gny6
related:
- TASK-rrp92
assignee: gerkules
tags:
- participant
- onboarding
- authentication
- ui
position: c30
created: 2026-08-27
updated: 2026-08-28
---

# Register Participants

## Description

Allow a new person with a normal Better Auth application session to enter
Participant context and complete mandatory booking-system onboarding.
Successful onboarding must create the separate Active Participant identity
required for Course membership and later Module participation without
requiring an Invite or pre-existing Assignment. Complete the normal
Participant Google entry, onboarding, home/zero-membership, and sign-out
browser journey while preserving the existing one-session principal model.

## Acceptance Criteria

- [ ] Participant context resolves the session's stable external principal to
      the current Participant from authoritative state; a principal with no
      Participant can enter onboarding without a Course Invite or existing
      Course Assignment.
- [ ] Participant remains a separate domain identity from any Admin User backed
      by the same external principal; one authentication session can support
      either context without persisting a selected role.
- [ ] Onboarding requires the person to explicitly supply or confirm a
      booking-system name and email; the name is non-blank after trimming and
      authentication-provider profile data is not authoritative.
- [ ] Email is retained after trimming surrounding whitespace and validating
      the resulting complete string, and is unique among registered
      Participants by case-insensitive comparison of that complete trimmed
      address without provider-specific alias or mailbox normalization.
- [ ] Successful onboarding creates exactly one Active Participant and, when
      no later membership action has occurred, zero Course Assignments and no
      Module Selections.
- [ ] Incomplete or abandoned onboarding creates no pending Participant or
      other booking-domain record and grants no normal participant application
      or Course access before onboarding succeeds.

- [ ] A concurrent or repeated onboarding completion for one external
      principal creates at most one Participant; duplicate-email or stale
      acceptance is refused without consuming another identity or partially
      changing profile data.
- [ ] Normal local entry uses the implemented Google provider with a fixed
      same-origin Participant destination; deterministic tests use fixed
      non-production Participant identities and never automate Google's UI.
- [ ] A registered Active Participant can refresh and return to the Participant
      home, see a truthful zero-membership state, and sign out; authentication
      alone never creates a Participant, Assignment, or Selection.

## UI/UX Expectations

The `/` Participant entry and onboarding use the MUI shell and German i18n.
Name/email fields have semantic labels, autocomplete hints, associated errors,
pending/refusal/success states, and predictable focus. The zero-membership
state explains the absence of Courses without exposing public discovery. All
states work by keyboard and at desktop/narrow viewports, survive refresh, and
do not rely on color alone.

## Verification Evidence Required

- Booking-domain Vitest for required name, complete trimmed-email validation,
  case-insensitive uniqueness, and provider-alias non-normalization.
- Worker/D1 tests for migration constraints, atomic one-Participant creation,
  external-principal resolution, duplicate-email concurrency, no partial
  onboarding, separate Admin/Participant identities, and fresh state.
- Structural authentication tests for fixed Participant destinations and
  production fixture exclusion; document manual Google smoke steps without
  automating the provider.
- Playwright for unauthenticated entry, fixed fixture session, onboarding,
  validation/refusal, zero membership, same-principal separate contexts,
  refresh, sign-out, mobile/desktop, keyboard/focus, privacy, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Participant profile editing, Participant Disable/Re-enable, and admin-side
Participant profile mutation are outside this task. Authentication alone does
not create a Participant or Course Assignment. Real production provider
integration and identity/provider linking remain outside the epic. Course
Invite continuation is owned by `TASK-5gny6`. Production provider credentials,
Apple/Microsoft/Facebook, passwords, and identity linking/merge/transfer remain
excluded. Create a fresh implementation plan when selected.

## References

- `docs/product/domain-model.md#participant`
- `docs/product/domain-model.md#participant-onboarding`
- `docs/product/course-access.md#participant-registration-and-onboarding`
- `docs/product/course-access.md#participant-profile`
- `docs/product/representative-scenarios.md#a-participant-onboarding-without-an-invite`
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
- `docs/architecture/authentication-and-sessions.md#bootstrap-and-onboarding-composition`
- `docs/architecture/authentication-and-sessions.md#providers-and-linking`
- `docs/process/verification.md#browser-tests`
- `docs/product/non-goals.md#identity-participant-and-admin-lifecycle`
