---
id: EPIC-m22qh
title: Core booking happy path
status: later
priority: medium
started: null
target: null
related:
- EPIC-566gf
- EPIC-bh5dj
tags:
- booking
- core
- happy-path
created: 2026-08-27
updated: 2026-08-28
---

# Core booking happy path

## Objective

Prove the booking system's central end-to-end model by allowing an
administrator to establish a Course and its bookable structure, register and
assign a Participant, and allow that Participant to manage their own Group
choice for a future Module. This first scope establishes a usable business
journey while preserving the distinction between Course membership and Module
participation.

## Key Results

- [x] KR1: A first Active Super Admin can bootstrap administration and create
      an Active Course with Groups and a future Scheduled Module.
- [ ] KR2: A new Active Participant can register, be discovered and assigned
      to that Course by an Active Admin User, and access the participation
      information allowed by that Assignment without exposing other
      Participants' private information.
- [ ] KR3: The assigned Participant can explicitly choose, change, and remove
      their own Group choice for the future Module while Course Assignment and
      Module Selection remain independent concepts.

## Notes

The accessible application-experience foundation in `EPIC-566gf` now precedes
the unfinished happy-path tasks. Every browser slice uses the accepted MUI
theme/shell, German i18n, responsive states, keyboard/focus behavior, and
appropriate accessibility evidence; the epic objective itself remains the
same central booking journey.

The first deployable behavior uses the accepted Better Auth boundary inside
`apps/booking-system-web`: deterministic named test identities establish
normal D1-backed opaque application sessions through an explicitly
non-production composition. Routine tests do not automate third-party provider
login UIs or bypass booking-domain authorization. Production exposes no
activatable test-authentication mechanism and fails closed when test-only
authentication is requested. Google authentication was implemented separately
under `TASK-t65sy` and remains outside this epic. Apple, Microsoft, and
Facebook authentication-provider integration is deferred.

One session establishes only the stable external principal. Participant and
Admin User remain independent domain identities, selected by application
context and resolved with their authorization from authoritative current state
on every request. No selected role, domain authority, Course Assignment, or
other booking authorization is stored in the session.

`TASK-7uxjj` completes explicit Participant registration and the
zero-Assignment Participant home. `TASK-z6hut` now completes Admin discovery
and direct Course Assignment. KR2 remains open until the separate
assigned-Participant Course-access work, including `TASK-qk47b`, is complete.

The following concerns are intentionally deferred beyond this epic:

- Course Invites, Admin Invites, and additional administrator onboarding;
- Participant and Course Assignment access lifecycle operations;
- Course, Group, and Module lifecycle operations beyond the creation
  capabilities included here;
- Admin-assisted booking;
- remote production provider credentials and callback/domain configuration;
  and
- remaining production-readiness work not already triggered by the first
  deployable application.

Participant profile editing, complete audit history, identity
linking/transfer/merging, and all other declared v1 non-goals are also outside
this epic. Canonical documentation remains authoritative for every included
capability. This backlog records delivery sequencing and does not authorize
implementation.
