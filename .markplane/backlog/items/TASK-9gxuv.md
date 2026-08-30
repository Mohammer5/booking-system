---
id: TASK-9gxuv
title: Implement validated Admin collection query contracts
status: done
priority: high
type: feature
effort: large
epic: EPIC-ruijc
plan: PLAN-bs9eh
depends_on:
- TASK-qwe92
blocks:
- TASK-3mi4s
related: []
assignee: gerkules
tags:
- worker
- persistence
- admin
position: a7
created: 2026-08-30
updated: 2026-08-30
---

# Implement validated Admin collection query contracts

## Description

Implement the application-private validated listing contract and D1 query
capabilities for Courses, global Participants, Admin Users, Admin Invites,
Course Assignments/Participants, Course Groups, and Course Modules. Add Course
detail retained counts, authorized Group/Module item reads, and bounded
Course-specific Participant options without changing product lifecycles.

Affected surfaces include Worker contracts/handlers/composition, Course,
Participant, Assignment, Group, Module, Admin User and Invite persistence, and
focused Worker/D1 tests. No migration is expected unless measured query behavior
proves a concrete index need.

## Acceptance Criteria

- [x] All seven collections accept only the specified page/pageSize/sort/search/
      filter matrix and return resource arrays plus authoritative pagination.
- [x] Malformed API parameters return deliberate 400 outcomes; raw parameters
      never become SQL identifiers/fragments, and search literals escape `%`,
      `_`, and the escape character.
- [x] Counts apply filters, every sort has the specified stable-ID tie-breaker,
      empty and beyond-last pages behave predictably, and Active Admin/Course
      scoping is freshly enforced.
- [x] Course detail returns retained participant/group/module counts and derives
      archival availability without transferring complete Modules.
- [x] Group/Module GET item reads enforce same-Course ownership and do not
      disclose cross-Course resources.
- [x] Participant options are bounded/server-searched and include global and
      Course Assignment state or explicit absence without exposing hidden data.
- [x] Existing mutation contracts and Admin Invite secret non-disclosure remain
      unchanged.

## Testing Requirements

Worker/Vitest covers every default, allowed filter/sort/direction, tie-break,
literal-search escape, page size/page, totals, empty/beyond-last, invalid input,
auth/Disabled Admin, parent not-found/privacy, lifecycle-inclusive counts,
item reads, options, and secret non-disclosure.

## Out Of Scope

Do not rename accurate Assignment APIs merely to mirror browser labels, add a
new workspace/package, interpolate raw SQL, or add speculative indexes.

## References

- `.instructions/0001.md#7-server-side-collection-contract`
- `docs/architecture/persistence.md`
- `apps/booking-system-web/src/worker`
