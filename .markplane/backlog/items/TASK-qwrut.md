---
id: TASK-qwrut
title: Extract Course Module collection, create, and detail routes
status: draft
priority: high
type: feature
effort: large
epic: EPIC-ruijc
plan: PLAN-xgvdk
depends_on:
- TASK-g9tdt
blocks:
- TASK-x8dax
related: []
assignee: null
tags:
- browser
- worker
- course-structure
position: aB
created: 2026-08-30
updated: 2026-08-30
---

# Extract Course Module collection, create, and detail routes

## Description

Move Course-owned Module discovery, creation, and complete management from
Course detail to stable collection/create/detail routes. Preserve Course-local
definite-instant/DST behavior, semantic time presentation, server-derived
schedule/cancellation capabilities, destructive focus semantics, retained
reference refusals, and Archived-Course history.

Affected surfaces include Module routes/pages/hooks/translations, query
invalidation, Worker GET contracts/persistence, old embedded ownership, and
focused regression tests.

## Acceptance Criteria

- [ ] Module collection implements the URL/list contract and displays title,
      Course-timezone start/end semantic times, state, and explicit detail.
- [ ] `/modules/new` owns future Module creation with DST gap/overlap behavior
      and navigates to a stable identity-preserving outcome.
- [ ] Module detail owns complete descriptive fields, schedule/rescheduling,
      cancellation/deletion, lifecycle capability/read-only presentation,
      breadcrumbs, and predictable focus.
- [ ] Archived Course collection/detail remain visible and read-only with
      retained selections/history intact.
- [ ] Same-Course item privacy and invalidation of item, collection prefixes,
      Course counts, Participant Course and participation reads are verified.
- [ ] No duplicate embedded Module management remains on Course detail.

## Testing Requirements

Worker item/list tests and Playwright collection/create/detail/edit/reschedule/
cancel/delete, DST/time boundaries, retained-reference refusal, Archived
read-only, direct refresh, responsive, focus, and axe evidence.

## Out Of Scope

Do not add Module to top-level navigation, change lifecycle/deadline rules, or
introduce MUI X or a migration without a concrete need.

## References

- `.instructions/0001.md#12-course-modules-collection-creation-and-detail`
- `docs/product/course-structure.md`
