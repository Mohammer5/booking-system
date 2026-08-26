---
id: TASK-aeij8
title: Establish first Admin bootstrap and application foundation
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on: []
blocks:
- TASK-ubm2q
- TASK-7uxjj
related: []
assignee: null
tags: []
position: a0
created: 2026-08-27
updated: 2026-08-27
---

# Establish first Admin bootstrap and application foundation

## Description

Establish the first usable administration entry and the application foundation
that makes it deployable. While no Admin User has ever existed, a person must
be able to authenticate through the application's identity boundary, supply
the required booking-system Admin User name, and become the first Active Super
Admin.

This is the implementation trigger for the first real application and booking
domain workspaces. When implementation is separately authorized, the behavior
is not complete unless the repository's accepted application, persistence,
architecture-boundary, verification, and release triggers are satisfied with
the first deployable outcome rather than postponed.

## Acceptance Criteria

- [ ] While no Admin User has ever existed, the administration authentication
      entry offers `Register admin` in place of normal Admin login, regardless
      of whether Participants already exist.
- [ ] A successful registrant authenticates through the application identity
      boundary, supplies an Admin User name that is non-blank after trimming,
      and becomes exactly one Active Admin User with Super Admin authority.
- [ ] Incomplete or abandoned bootstrap creates no Admin User; competing
      completions are decided from authoritative current state so only the
      first accepted creation succeeds.
- [ ] Bootstrap never reopens after an Admin User has ever been created, and
      authentication alone does not create later Admin Users.
- [ ] The authentication boundary provides the explicitly non-production,
      deterministic test identities required by browser verification without
      automating third-party provider login UIs or enabling test-only access
      in production; production fails closed if test-only authentication is
      requested.
- [ ] The first deployable behavior demonstrably satisfies all applicable
      accepted application/workspace, persistence, explicit boundary
      enforcement, regression verification, and release-trigger contracts.

## Notes

Production Google, Apple, Microsoft, and Facebook authentication integration,
Admin Invites, additional Admin User onboarding, and Super Admin promotion are
outside this task. No implementation plan is attached; a detailed plan belongs
to a later explicitly selected implementation session.

## References

- `docs/product/admin-access.md#first-admin-bootstrap`
- `docs/product/domain-model.md#administration-and-invitations`
- `docs/architecture/_status.md`
- `docs/architecture/applications.md#accepted-initial-boundary`
- `docs/architecture/module-organization.md`
- `docs/architecture/runtime-and-hosting.md#implementation-trigger`
- `docs/architecture/persistence.md#current-state-and-implementation-trigger`
- `docs/architecture/boundaries.md#activation-rule`
- `docs/architecture/eslint.md#dependency-boundaries`
- `docs/process/verification.md#application-implementation-trigger`
- `docs/process/releases.md#current-state-and-implementation-trigger`
