---
id: TASK-7uxjj
title: Register Participants
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on:
- TASK-aeij8
blocks:
- TASK-z6hut
related: []
assignee: null
tags: []
position: a3
created: 2026-08-27
updated: 2026-08-27
---

# Register Participants

## Description

Allow a new person with a normal Better Auth application session to enter
Participant context and complete mandatory booking-system onboarding.
Successful onboarding must create the separate Active Participant identity
required for Course membership and later Module participation without
requiring an Invite or pre-existing Assignment.

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

## Notes

Participant profile editing, Participant Disable/Re-enable, and admin-side
Participant profile mutation are outside this task. Authentication alone does
not create a Participant or Course Assignment. Real production provider
integration and identity/provider linking remain outside the epic.

## References

- `docs/product/domain-model.md#participant`
- `docs/product/domain-model.md#participant-onboarding`
- `docs/product/course-access.md#participant-registration-and-onboarding`
- `docs/product/course-access.md#participant-profile`
- `docs/product/representative-scenarios.md#a-participant-onboarding-without-an-invite`
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
- `docs/architecture/authentication-and-sessions.md#bootstrap-and-onboarding-composition`
