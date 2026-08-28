---
id: TASK-qk47b
title: Access an assigned Course as a Participant
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: PLAN-nz5n6
depends_on:
- TASK-6tfxd
- TASK-z6hut
blocks:
- TASK-jvqrk
- TASK-fzniz
related: []
assignee: gerkules
tags:
- participant
- course-access
- privacy
- ui
position: c50
created: 2026-08-27
updated: 2026-08-28
---

# Access an assigned Course as a Participant

## Description

Allow an Active Participant with an Active Course Assignment to access the
assigned Active Course and see exactly the information needed to decide their
own Module participation. The access boundary must expose useful Course
structure without creating public discovery or leaking other Participants'
private information. Provide a Participant home/list and stable Course detail
route so this access is manually usable, refresh-safe, and resolved from
current Participant and Assignment state rather than cached session authority.

## Acceptance Criteria

- [x] Participant-facing access to the Active Course requires both an Active
      Participant and an Active Course Assignment.
- [x] An eligible Participant can see relevant Course information, its
      Modules, Active Groups with relevant details, and that Participant's own
      Module Selection state.
- [x] Course access exposes no global Participant directory, other
      Participant profile or email, other Participant Selection, full roster,
      or administrative data.
- [x] A person without current Admin access or Active Participant plus Active
      Assignment access cannot publicly discover or view the Course.

- [x] Participant home lists only Courses reached through that Participant's
      current Active Assignments, preserves the truthful zero-membership
      state, and keeps independent memberships in multiple Courses separate.
- [x] Every read re-resolves the current Participant and Assignment; Disabled
      Participant, Revoked/missing Assignment, stale navigation, and a
      cross-Participant/Course identifier receive an unavailable/not-found
      result without leaking whether private data exists.
- [x] Direct Course navigation and refresh work through the same-origin SPA
      route without exposing another Participant's roster, profile, email,
      Selection, or administrative data in browser or API representations.

## UI/UX Expectations

Use German-first MUI home, Course list, and Course detail states. Present
Modules and Active Group details clearly on desktop and narrow/mobile screens,
including honest empty/loading/error/unavailable states. Navigation and all
read-only controls work by keyboard with visible focus; accessibility scans and
semantic landmark/heading assertions apply. Do not render a participant roster
or public catalogue.

## Verification Evidence Required

- Booking-domain Vitest for the Active Participant plus Active Assignment
  access predicate and independent Course memberships.
- Worker/D1 tests for authoritative resolution, identifier isolation,
  Disabled/Revoked/missing refusal, and narrow privacy-safe representations.
- Playwright for zero/one/multiple assigned Courses, direct navigation and
  refresh, stale access loss, privacy probes, responsive widths,
  keyboard/focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Archived-Course historical access is owned by `TASK-fzniz`. Selection mutation
is owned by `TASK-jvqrk`; Course Invites remain separate. No public discovery,
rosters, Group counts, or Participant-visible peer profiles are added. Create
a fresh implementation plan when selected.

Completed locally with 153 booking-domain tests, 104 Worker/D1/migration tests,
both production builds, and 23 Chromium E2E tests passing through the final
canonical `pnpm check`. Focused evidence includes 21 domain access-policy tests,
23 Worker/D1/HTTP tests, the 2-test Participant Course Playwright spec, and the
4-test Participant registration regression spec with privacy, axe, focus,
keyboard, responsive, refresh, and overflow assertions intact.

## References

- `docs/product/domain-model.md#course-assignment`
- `docs/product/course-access.md#course-access-and-visibility`
- `docs/product/course-access.md#participant-privacy`
- `docs/product/course-access.md#no-public-discovery`
- `docs/product/course-access.md#multiple-courses`
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
- `docs/architecture/browser-conventions.md#routing-and-navigation`
- `docs/process/verification.md#browser-tests`
