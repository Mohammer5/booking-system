---
id: TASK-qk47b
title: Access an assigned Course as a Participant
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on:
- TASK-6tfxd
- TASK-z6hut
blocks:
- TASK-jvqrk
related: []
assignee: null
tags: []
position: a5
created: 2026-08-27
updated: 2026-08-27
---

# Access an assigned Course as a Participant

## Description

Allow an Active Participant with an Active Course Assignment to access the
assigned Active Course and see exactly the information needed to decide their
own Module participation. The access boundary must expose useful Course
structure without creating public discovery or leaking other Participants'
private information.

## Acceptance Criteria

- [ ] Participant-facing access to the Active Course requires both an Active
      Participant and an Active Course Assignment.
- [ ] An eligible Participant can see relevant Course information, its
      Modules, Active Groups with relevant details, and that Participant's own
      Module Selection state.
- [ ] Course access exposes no global Participant directory, other
      Participant profile or email, other Participant Selection, full roster,
      or administrative data.
- [ ] A person without current Admin access or Active Participant plus Active
      Assignment access cannot publicly discover or view the Course.

## Notes

Archived-Course behavior is outside this task.

## References

- `docs/product/domain-model.md#course-assignment`
- `docs/product/course-access.md#course-access-and-visibility`
- `docs/product/course-access.md#participant-privacy`
- `docs/product/course-access.md#no-public-discovery`
