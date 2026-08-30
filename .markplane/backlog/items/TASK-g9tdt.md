---
id: TASK-g9tdt
title: Extract Course Group collection, create, and detail routes
status: done
priority: high
type: feature
effort: large
epic: EPIC-ruijc
plan: PLAN-urack
depends_on:
- TASK-5uzbb
blocks:
- TASK-qwrut
related: []
assignee: gerkules
tags:
- browser
- worker
- course-structure
position: aA
created: 2026-08-30
updated: 2026-08-30
---

# Extract Course Group collection, create, and detail routes

## Description

Move Course-owned Group discovery, creation, and management from Course detail
to stable collection/create/detail routes. Reuse the existing validated forms
and lifecycle dialogs under their new resource owners, preserving all
retained-reference, name-conflict, focus, and Archived-Course rules.

Affected surfaces include Group routes/pages/hooks/translations, query
invalidation, Group Worker GET contracts/persistence, old embedded ownership,
and focused regression tests.

## Acceptance Criteria

- [x] Group collection implements the full URL/list contract and displays name,
      truncated optional details, state, and explicit detail actions.
- [x] `/groups/new` owns creation and navigates on success to a stable result
      retaining the created Group identity.
- [x] Group detail owns complete fields, edit/archive/reactivate/delete,
      refusals, parent Course context, breadcrumbs, and predictable focus.
- [x] Archived Course collection/detail remain visible and read-only; direct
      create and mutations are unavailable or authoritatively refused.
- [x] Same-Course item lookup privacy and query invalidation of item, collection
      prefixes, Course counts, Participant Course reads, and participation reads
      are verified.
- [x] No duplicate embedded Group management remains on Course detail.

## Testing Requirements

Worker item/list tests and Playwright collection/create/detail/edit/archive/
reactivate/delete, conflict/reference refusal, Archived read-only, direct
refresh, responsive, focus, and axe evidence.

## Out Of Scope

Do not add Group to top-level navigation, change Group lifecycle policy, or add
a migration without demonstrated need.

## References

- `.instructions/0001.md#11-course-groups-collection-creation-and-detail`
- `docs/product/course-structure.md`
