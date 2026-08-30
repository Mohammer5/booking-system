---
id: TASK-h37zt
title: Complete deterministic local fixtures and migration setup
status: backlog
priority: high
type: chore
effort: medium
epic: EPIC-hikpy
plan: null
depends_on:
- TASK-5gny6
- TASK-ikzih
- TASK-2nh3b
- TASK-fzniz
- TASK-25j4s
blocks:
- TASK-t8jzz
related: []
assignee: null
tags:
- fixtures
- migrations
- testing
- local
position: a2
created: 2026-08-27
updated: 2026-08-27
---

# Complete deterministic local fixtures and migration setup

## Description

Complete the explicitly non-production fixture composition and clean local D1
preparation for the full v1 application. Earlier feature tasks extend fixtures
only as needed; this task consolidates deterministic named identities and state
setup for all final Admin/Participant journeys without creating a production
authentication bypass or relying on a developer database.

## Acceptance Criteria

- [ ] Fixed named fixtures cover first/later ordinary Admins, multiple Super
      Admins, Disabled/deleted-return Admin cases, new/Active/Disabled
      Participants, zero/multiple Assignments, and the lifecycle/history states
      required by representative acceptance journeys.
- [ ] Fixture-session establishment still creates only normal signed Better
      Auth sessions for a finite allow-list. Paths, bodies, queries, headers,
      and cookies cannot supply an arbitrary external principal, role,
      authority, Participant, Assignment, or permission.
- [ ] Production composition has no import or activatable route for fixture
      establishment and fails closed regardless of request-controlled signals;
      automated structural evidence covers every expanded fixture path.
- [ ] One documented local command prepares a fresh isolated D1 database by
      applying the complete version-controlled migration chain, then establishes
      deterministic fixture state without reading real Google secrets or a
      developer's normal database.
- [ ] Clean migration verification proves the full Better Auth and booking
      schema, constraints, and seed assumptions from an empty database. No
      manual schema mutation or runtime fixture state enters production source.
- [ ] Time-dependent states use injected clocks or explicit definite instants,
      never sleeps or dependence on wall-clock timing; repeated setup is
      deterministic and isolated.
- [ ] Secrets/session tokens and private Invite values are absent from logs,
      Playwright artifacts, and committed fixture definitions.

## UI/UX Expectations

Fixture tooling has no product-facing UI. The non-production server must still
serve the exact normal German MUI application after session establishment so
Playwright exercises real routes, authorization, focus, responsive behavior,
and persistence. Fixture paths must not appear as normal navigation.

## Verification Evidence Required

- Worker/D1 migration and fixture tests from a clean database, including
  idempotent setup, constraints, deterministic instants, and isolated state.
- Structural production-worker/build tests for every request-controlled
  fixture attempt plus boundary checks proving production has no import edge.
- Playwright smoke evidence that each fixed identity reaches normal app state,
  cannot select another identity, and no real provider UI/credential is used.
- Secret/artifact scans, production build, and full `pnpm check`.

## Out Of Scope / Notes

Hosted staging fixture gating belongs to release hardening. Do not add generic
impersonation, production seeding, remote databases, provider automation, or
sleep-based time control. Create a fresh implementation plan when selected.

## References

- `docs/architecture/authentication-and-sessions.md#non-production-authentication`
- `docs/architecture/persistence.md#migration-contract`
- `docs/process/verification.md#browser-tests`
- `docs/process/verification.md#product-and-worker-tests`
- `docs/product/representative-scenarios.md`
- `TASK-aeij8`
- `TASK-t65sy`
