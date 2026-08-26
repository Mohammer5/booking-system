---
id: TASK-z6hut
title: Assign Participants to Courses
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on:
- TASK-ubm2q
- TASK-7uxjj
blocks:
- TASK-qk47b
related: []
assignee: null
tags: []
position: a4
created: 2026-08-27
updated: 2026-08-27
---

# Assign Participants to Courses

## Description

Allow an Active Admin User to discover fully registered Participants and
establish ordinary Course membership by direct administrative Course
Assignment. This enables access to the intended Course while preserving the
central distinction between Course membership and Module participation.

## Acceptance Criteria

- [ ] An Active Admin User can discover every fully registered Participant,
      including a Participant with zero Course Assignments, through a minimum
      representation containing name, email, and Active or Disabled global
      state.
- [ ] A fully registered Participant with no Assignment can receive one Active
      Course Assignment to an Active Course through direct administrative
      assignment.
- [ ] Assigning a Participant who already has an Active Assignment to that
      Course is an idempotent successful no-op.
- [ ] A Participant/Course pair never receives duplicate Course Assignments.
- [ ] Direct Assignment creates ordinary Course membership only and does not
      implicitly create a Module Selection or a separate origin-specific
      membership state.

## Notes

Assignment revocation/reactivation and Course Invite joining are outside this
task.

## References

- `docs/product/domain-model.md#course-assignment`
- `docs/product/domain-model.md#structure-and-membership`
- `docs/product/course-access.md#participant-administration`
- `docs/product/course-access.md#administrative-assignment`
