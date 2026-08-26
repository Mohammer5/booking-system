---
id: EPIC-m22qh
title: Core booking happy path
status: next
priority: medium
started: null
target: null
related: []
tags: []
created: 2026-08-27
updated: 2026-08-27
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

- [ ] KR1: A first Active Super Admin can bootstrap administration and create
      an Active Course with Groups and a future Scheduled Module.
- [ ] KR2: A new Active Participant can register, be discovered and assigned
      to that Course by an Active Admin User, and access the participation
      information allowed by that Assignment without exposing other
      Participants' private information.
- [ ] KR3: The assigned Participant can explicitly choose, change, and remove
      their own Group choice for the future Module while Course Assignment and
      Module Selection remain independent concepts.

## Notes

The first deployable behavior establishes the authentication and identity
boundary through the explicitly non-production mechanism required for
deterministic browser testing. Routine tests do not automate third-party
provider login UIs, test identities remain deterministic, production exposes
no hidden test-authentication bypass, and production fails closed when
test-only authentication is requested. Real Google, Apple, Microsoft, and
Facebook authentication-provider integration is deferred.

The following concerns are intentionally deferred beyond this epic:

- Course Invites, Admin Invites, and additional administrator onboarding;
- Participant and Course Assignment access lifecycle operations;
- Course, Group, and Module lifecycle operations beyond the creation
  capabilities included here;
- Admin-assisted booking;
- real production authentication-provider integration; and
- remaining production-readiness work not already triggered by the first
  deployable application.

Participant profile editing, complete audit history, identity
linking/transfer/merging, and all other declared v1 non-goals are also outside
this epic. Canonical documentation remains authoritative for every included
capability. This backlog records delivery sequencing and does not authorize
implementation.
