---
id: TASK-5uzbb
title: Extract Course Participant collection and detail navigation
status: draft
priority: high
type: feature
effort: large
epic: EPIC-ruijc
plan: PLAN-s3gmg
depends_on:
- TASK-3mi4s
blocks:
- TASK-g9tdt
related: []
assignee: null
tags:
- browser
- worker
- course-access
position: a9
created: 2026-08-30
updated: 2026-08-30
---

# Extract Course Participant collection and detail navigation

## Description

Extract Course membership into the Course Participants collection and
Course-scoped Participant detail routes while preserving the distinction between
global Participant and Course Assignment. Replace list-all participant dialogs
with one bounded server-searched picker reusable by direct Assignment and
Admin-assisted Selection targeting.

Affected surfaces include browser routes/pages/hooks/translations, Assignment
and administrative-participation reads, participant pickers, mutation
invalidation, compatibility redirects, and Worker/Playwright tests.

## Acceptance Criteria

- [ ] `/admin/courses/:courseId/participants` paginates retained Active/Revoked
      Assignments with Participant/global and Assignment state, exact filters,
      sorting, actions, parent context, and Active/Archived rules.
- [ ] Course Participant detail consolidates identity/email/global state,
      Assignment state/absence and lifecycle actions, historical selections,
      and Admin-assisted Selection with server-derived availability/refusals.
- [ ] Active Course assignment/reactivation/revocation and Archived Course
      revocation-only rules remain authoritative; Archived Selection mutation is
      absent.
- [ ] Direct Assignment and assisted-target dialogs use an accessible bounded
      server-searched picker and can discover Participants beyond the first
      global-directory page.
- [ ] Old `/participation` browser URLs redirect with replace navigation; no API
      alias is added solely for browser naming.
- [ ] The broad overview no longer transfers complete unrelated Course Groups
      and Modules for the collection route.

## Testing Requirements

Worker and Playwright evidence covers collection state, parent privacy, picker
search/result states/keyboard/focus, Assignment lifecycle, assisted Selection,
Archived history/read-only behavior, compatibility redirects, refresh, and axe.

## Out Of Scope

Do not conflate Participant state with Assignment state, expose peer data to
Participant routes, or create an Admin-only Participant creation flow.

## References

- `.instructions/0001.md#10-course-participants-collection-and-detail`
- `docs/product/course-access.md`
- `docs/product/module-participation.md`
