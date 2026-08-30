---
id: TASK-ix2jk
title: Define Admin collection and detail conventions
status: done
priority: high
type: enhancement
effort: large
epic: EPIC-ruijc
plan: PLAN-wyqpk
depends_on: []
blocks:
- TASK-qwe92
related: []
assignee: gerkules
tags:
- docs
- admin
- architecture
position: a5
created: 2026-08-30
updated: 2026-08-30
---

# Define Admin collection and detail conventions

## Description

Replace canonical statements that make Course detail the owner of complete child
collections with the accepted resource-oriented Admin information architecture.
Record the four top-level resources, Course-owned nested collections, collection
and detail responsibilities, URL-owned list state, server-side list processing,
responsive rendering, incidental-dialog boundary, and Participant/Assignment
distinction without leaking implementation mechanics into product rules.

Affected surfaces include architecture decisions/status/indexes, applications,
browser conventions, module organization, runtime/hosting, persistence,
boundaries, root status/index, process verification/status/index, and any README
whose current route or implementation inventory becomes stale.

## Acceptance Criteria

- [x] Canonical docs describe exactly Courses, Participants, Admin Users, and
      Admin Invites as top-level Admin resources and keep Groups/Modules nested
      beneath Course.
- [x] Collection/detail ownership, linked Course counts, URL-owned list state,
      server pagination/filter/sort, responsive table/card rendering, and local
      incidental dialogs are recorded as accepted architecture.
- [x] Conflicting embedded Course membership/Group/Module/administrative-
      participation statements are removed or rewritten rather than retained.
- [x] Product docs remain implementation agnostic and preserve every existing
      domain invariant.
- [x] Routing indexes and status summaries remain complete, and the required
      dictionary coverage pass finds no unjustified new term.
- [x] Documentation links and repository formatting checks pass.

## Testing Requirements

Run focused documentation searches for superseded wording, `markplane check`,
and repository lint/check surfaces that validate documentation and routing.

## Out Of Scope

No browser, Worker, persistence, or test implementation belongs to this task.

## References

- `.instructions/0001.md`
- `docs/process/conceptual-simplicity.md`
- `docs/process/verification.md`
- `docs/architecture/_index.md`
- `docs/product/domain-model.md`
