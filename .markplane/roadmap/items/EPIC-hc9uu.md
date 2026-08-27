---
id: EPIC-hc9uu
title: Admin identities and invitations
status: later
priority: medium
started: null
target: null
related:
- EPIC-hikpy
tags:
- admin
- identity
- invitations
created: 2026-08-27
updated: 2026-08-27
---

# Admin identities and invitations

## Objective

Complete later Admin admission, the current Admin directory, one-way Super
Admin promotion, and authorized Admin lifecycle/deletion. Preserve fresh
authority resolution, at least one Active Super Admin, and independence from
all booking content and a same-principal Participant.

## Key Results

- [ ] KR1: Admin Invites have secure one-time URL visibility, terminal lifecycle,
      atomic claims, and safe Google continuation for new ordinary Admins.
- [ ] KR2: Every current Admin is listable/editable within the ordinary/Super
      target matrix, and eligible one-way promotion supports several Super
      Admins.
- [ ] KR3: Disable/Re-enable/delete enforces self and last-Active-Super-Admin
      protection under stale/concurrent requests with zero booking cascades.

## Notes

This epic can progress alongside core booking after the accessible shell, but
the final Admin lifecycle task waits for representative booking records so its
no-cascade contract is demonstrable. Demotion, transfer/succession, passwords,
identity merging, Invite expiry/reuse, and complete audit history are excluded.
