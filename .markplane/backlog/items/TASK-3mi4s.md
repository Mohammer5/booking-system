---
id: TASK-3mi4s
title: Normalize top-level Admin collection views
status: done
priority: high
type: feature
effort: large
epic: EPIC-ruijc
plan: PLAN-zf23i
depends_on:
- TASK-9gxuv
blocks:
- TASK-5uzbb
related: []
assignee: gerkules
tags:
- browser
- admin
- collections
position: a8
created: 2026-08-30
updated: 2026-08-30
---

# Normalize top-level Admin collection views

## Description

Normalize Courses, global Participants, Admin Users, and Admin Invites around a
focused shared Admin collection browser concept. The URL must own applied list
state, TanStack keys must contain normalized state, and desktop tables/mobile
cards must render the same server page with resource-specific filters, sorts,
actions, and state distinctions.

Affected surfaces include a browser-private collection parser/layout primitive,
the four top-level pages and hooks, localized copy, mutation invalidation, and
focused browser tests.

## Acceptance Criteria

- [x] Each top-level collection implements its exact search/filter/sort matrix,
      one-based pagination, allowed page sizes, deterministic defaults, URL
      repair, reset semantics, bookmark/refresh, and back/forward restoration.
- [x] Wide semantic tables expose accessible sortable headings and explicit row
      actions; narrow named card lists retain filters, sort, pagination, actions,
      and meaning without page overflow.
- [x] Initial loading, authorization refusal, technical failure, true empty,
      filtered empty with reset, populated, and applicable mutation-success
      states are distinct.
- [x] Admin User lifecycle/authority controls live only on detail; Invite create
      and revoke invalidate list prefixes and never cache the one-time URL.
- [x] Course creation, Participant no-creation, and Admin Invite/Admin User
      creation rules remain unchanged.

## Testing Requirements

Add URL parser unit coverage and Playwright coverage for all four routes,
search/filter/sort/page/pageSize, URL repair/restoration, filtered-empty reset,
responsive table/cards, explicit actions, mutations, focus, and representative
axe scans.

## Out Of Scope

Do not add Participant or direct Admin User creation, MUI X, browser slicing of
all rows, or storage-backed list state.

## References

- `.instructions/0001.md#6-collection-view-convention`
- `.instructions/0001.md#8-top-level-collection-pages`
- `docs/architecture/browser-conventions.md`
