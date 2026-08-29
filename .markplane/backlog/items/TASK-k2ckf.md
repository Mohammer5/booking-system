---
id: TASK-k2ckf
title: Manage shared Course Invites
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-ziadc
plan: PLAN-38qq6
depends_on:
- TASK-ubm2q
- TASK-dfq2k
blocks:
- TASK-5gny6
- TASK-ikzih
related:
- TASK-wny83
assignee: gerkules
tags:
- course-invite
- security
- ui
position: f10
created: 2026-08-27
updated: 2026-08-29
---

# Manage shared Course Invites

## Description

Implement the one-current-shared-Invite lifecycle for each Course and its
minimal public recognition boundary. Active Admin Users must create, retrieve,
copy, disable, re-enable, and replace the current Invite for an Active Course;
replacement invalidates predecessors without automatic expiration or
person-specific state.

## Acceptance Criteria

- [x] An Active Course has no Invite or exactly one current shared Invite,
      enabled or disabled. An Active Admin User can create the first enabled
      Invite, disable/re-enable it, and replace either current state with a new
      enabled Invite.
- [x] Replacement permanently invalidates the predecessor for Join. No Invite
      expires automatically, and multiple Participants may reuse/forward the
      current enabled URL.
- [x] The current URL is retrievable and copyable during Active-Course
      administration without regeneration; copying never invalidates links.
- [x] A recognized current or predecessor token may reveal only Course name
      and available/unavailable state even when disabled, replaced, or the
      Course is Archived. Unknown/malformed tokens reveal no Course name or
      other data.
- [x] No public result exposes roster, Participant profile/Selection, private
      Group/Module access detail, Admin data, or other Invite information.
- [x] Archived Course Invite mutation is refused. Current Admin, Course, and
      Invite state is revalidated so stale/concurrent enable/disable/replace
      actions leave one coherent current Invite and no recoverable predecessor
      authority.
- [x] Raw Invite secrets do not enter diagnostic logs, analytics, referrers, or
      unrelated browser/API representations.

## UI/UX Expectations

The Admin Course view uses German-first MUI controls for no-Invite, enabled,
disabled, copied, replaced, stale, unavailable, and technical-error states.
Replacement and disabling use accessible confirmation where consequence is
destructive. Copy has a semantic accessible name and announced result. The
minimal public Invite route works on refresh and mobile/desktop without
revealing private context; keyboard/dialog focus and non-color-only state apply.

## Verification Evidence Required

- Booking-domain Vitest for exact lifecycle transitions, one-current invariant,
  predecessor recognition/invalidation, no expiration, and visibility rules.
- Worker/D1 tests for token lookup/storage boundaries, atomic concurrent
  replacement, authorization, Archived refusal, narrow representations, and
  secret-safe diagnostics.
- Playwright for Admin create/retrieve/copy/disable/re-enable/replace and public
  recognized/unrecognized states, direct refresh, privacy probes, responsive
  widths, keyboard/dialog focus, and axe scans.
- Full `pnpm check`.

## Out Of Scope / Notes

Join/authentication continuation is `TASK-5gny6`. Do not add person-specific
Invites, expiry, multiple current links, public Course discovery, or remote
analytics. Exact token format remains an implementation-plan choice and must be
security-reviewed. Create a fresh implementation plan when selected.

## References

- `docs/product/course-access.md#shared-course-invite`
- `docs/product/course-access.md#exact-current-invite-lifecycle`
- `docs/product/course-access.md#recognized-invite-visibility`
- `docs/product/representative-scenarios.md#h-shared-invite-and-minimal-visibility`
- `docs/product/representative-scenarios.md#i-recognized-unusable-course-invite`
- `docs/product/non-goals.md#invitations-and-accounts`
- `docs/architecture/authentication-and-sessions.md#invite-continuation`
- `docs/architecture/browser-conventions.md#diagnostic-logging`
- `docs/process/verification.md`
