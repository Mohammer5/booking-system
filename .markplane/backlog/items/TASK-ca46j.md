---
id: TASK-ca46j
title: Maintain Participant profiles
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-bh5dj
plan: null
depends_on:
- TASK-z6hut
blocks:
- TASK-25j4s
related:
- TASK-45jmb
assignee: null
tags:
- participant
- profile
- ui
position: d10
created: 2026-08-27
updated: 2026-08-27
---

# Maintain Participant profiles

## Description

Allow an Active Participant to maintain their own booking-system name and
email and allow an Active Admin User to edit either field for any Active or
Disabled Participant. Profile values are mutable properties, never identity or
authentication-provider authority, and every accepted or refused edit must
preserve the Participant's lifecycle and relationships.

## Acceptance Criteria

- [ ] An Active Participant can view and edit only their own required name and
      email; a Disabled Participant has no participant-side profile access.
- [ ] A freshly resolved Active Admin User can edit an Active or Disabled
      Participant through the administration directory/detail experience.
- [ ] Name is non-blank after trimming for validation. Email is trimmed for
      storage, validated as the complete resulting address, and unique among
      Participants by case-insensitive comparison of that complete address.
- [ ] Provider-specific transformations are absent: dots, `+tag` suffixes,
      aliases, and mailbox/provider equivalence are not inferred. Provider
      profile changes never mutate booking-system profile values.
- [ ] Successful edits preserve Participant identity, state, external
      principal relationship, Assignments, Selections, and history. A
      duplicate/invalid/stale/concurrent refusal leaves all current values
      unchanged.
- [ ] Matching names or emails never merge Participants or authentication
      principals, and editing a Participant never changes an Admin User backed
      by the same principal.

## UI/UX Expectations

Provide a directly navigable Participant profile view and Admin Participant
detail/edit action using German-first MUI forms. Existing values, required
labels, validation, pending, duplicate-email, stale/unavailable, success, and
technical-error states are accessible by keyboard and announced with
predictable focus. Both contexts remain usable on desktop and narrow/mobile
screens and do not imply provider-verified email.

## Verification Evidence Required

- Booking-domain Vitest for validation, exact normalization examples,
  uniqueness, preservation of identity/relationships, and Disabled self-edit
  refusal.
- Worker/D1 tests for case-insensitive unique constraints, atomic edits,
  concurrent duplicate attempts, current Participant/Admin authorization, and
  no cross-identity cascade.
- Playwright for Participant self-edit and Admin edit of Active/Disabled
  profiles, duplicate and stale refusal, direct refresh, responsive widths,
  keyboard/focus/error association, privacy, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Participant Disable/Re-enable is `TASK-25j4s`. No hard deletion, provider data
mutation, email verification, identity merge/link/transfer, or complete audit
history is added. Create a fresh implementation plan when selected.

## References

- `docs/product/domain-model.md#participant`
- `docs/product/domain-model.md#identity-and-profile`
- `docs/product/course-access.md#participant-profile`
- `docs/product/course-access.md#profile-editing`
- `docs/product/representative-scenarios.md#c-participant-profile-editing`
- `docs/product/representative-scenarios.md#d-external-authentication-principals`
- `docs/product/non-goals.md#identity-participant-and-admin-lifecycle`
- `docs/architecture/authentication-and-sessions.md#technical-principal-and-domain-identities`
- `docs/process/verification.md`
