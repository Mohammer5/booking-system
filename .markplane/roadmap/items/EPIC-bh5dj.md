---
id: EPIC-bh5dj
title: Participant profiles and membership lifecycle
status: later
priority: medium
started: null
target: null
related:
- EPIC-m22qh
- EPIC-i2x79
tags:
- participant
- membership
- lifecycle
created: 2026-08-27
updated: 2026-08-27
---

# Participant profiles and membership lifecycle

## Objective

Complete Participant profile/global lifecycle and Course-specific membership
administration after the core happy path exists. Preserve the separation of
Participant state, Assignment state, authentication, and retained Selection
history across multiple Courses.

## Key Results

- [ ] KR1: Participants and Admin Users can perform every authorized profile
      edit with the exact email contract and no identity merge/cascade.
- [ ] KR2: Disable/Re-enable produces the exact global access and Selection
      retention behavior with no future-Selection restoration.
- [ ] KR3: Assignment view/revoke/reactivate behavior is atomic, idempotent
      where specified, Course-independent, privacy-safe, and browser-usable.

## Notes

Depends on the core Participant/Assignment/Selection slices. Participant hard
deletion, self-leave, identity merge/transfer, and complete audit histories
remain non-goals. Course archival composes with this epic later rather than
changing its membership rules.
