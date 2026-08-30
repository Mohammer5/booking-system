---
id: PLAN-bs9eh
title: Implementation plan for Implement validated Admin collection query contracts
status: done
implements:
- TASK-9gxuv
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Validated Admin collection query contracts implementation plan

## Overview

Add one private parsing/SQL-listing mechanism and resource-specific D1 queries
for the seven collection contracts, plus Course counts/item reads/options.

## Ground Truth

- `src/worker/course-structure/courseHttpContract.js` — Course route/response shapes.
- `src/worker/course-structure/create{Course,Group,Module}Persistence.js` — current reads.
- `src/worker/course-access/courseAccessHttpContract.js` — Participant/Assignment routes.
- `src/worker/course-access/createAdministrativeParticipationPersistence.js`
  — broad read to decompose.
- `src/worker/admin-bootstrap/create{Admin,AdminInvite}Persistence.js` — Admin lists.

## Approach

Create `worker/admin-collections` with strict resource configurations for
pagination, filters, and static sort SQL. Parse `URLSearchParams` at handlers and
return one deliberate invalid-list-query outcome. Persistence methods receive
only normalized values and use bound clauses, escaped literal LIKE patterns,
count/page batches, and stable ID ordering. Resource mappers remain with owners.

## Non-Goals / Out of Scope

Browser URL parsing/rendering and lifecycle-policy changes are excluded. No
migration unless query plans demonstrate a required index.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Resource config + private mechanics | Shares safety without generic package ownership. |
| Empty page beyond last | Predictable response preserving requested normalized page. |
| Existing accurate API nouns | Browser labels do not redefine Course Assignment. |
| Batched count/page reads | Authoritative totals and one request boundary. |

## Phases

### Phase 1: Contract and top-level reads

- [x] Add parser/serializer-independent Worker normalization and tests.
- [x] Paginate Courses, Participants, Admin Users, and Invites.
- [x] Preserve fresh Admin authorization and secret-safe mappings.

**Checkpoint**: every top-level list returns a validated paginated response.

### Phase 2: Course-owned reads

- [x] Paginate Assignment, Group, and Module collections with parent context.
- [x] Add same-Course Group/Module item GETs and participant options.
- [x] Replace Course full child arrays with counts/archival capability.
- [x] Add exhaustive Worker/D1 contract coverage.

**Checkpoint**: all nested reads, counts, options, and privacy tests pass.

## Testing Strategy

Table-driven parser tests plus HTTP/persistence tests for every allowlist value,
tie-break, literal wildcard escape, totals/page boundaries, auth, privacy,
lifecycle-inclusive counts, and secret omission.

## Rollback Plan

Revert the server-contract commit before dependent browser list commits; no data
migration means stored state is unaffected.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

## Cross-Plan Contract: Collection response

Every list returns its resource-specific array and `{ page, pageSize,
totalItems, totalPages }`; nested lists additionally return minimum `course`
context. Input normalization exactly follows `.instructions/0001.md` section 6.
