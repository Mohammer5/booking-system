---
id: TASK-ubm2q
title: Create and view Courses
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on:
- TASK-aeij8
blocks:
- TASK-6tfxd
- TASK-z6hut
related: []
assignee: null
tags: []
position: a1
created: 2026-08-27
updated: 2026-08-27
---

# Create and view Courses

## Description

Allow an Active Admin User to create and subsequently view an Active Course
with the complete canonical minimal data contract. The result provides the
empty Course container needed for later Groups, Modules, Assignments, and
participation without inventing placeholder business objects.

## Acceptance Criteria

- [ ] An Active Admin User can create and subsequently view a Course with a
      required name that is non-blank after trimming and an optional
      description; Course names need not be unique and are not identity.
- [ ] The Course has one valid IANA/TZDB timezone, defaults to
      `Europe/Berlin` when none is chosen, and rejects a fixed UTC offset as a
      timezone substitute.
- [ ] A successfully created Course is Active with zero Groups, zero Modules,
      zero Course Assignments, and no Course Invite.
- [ ] Creating the Course does not implicitly create any other business
      object.

## Notes

Course archival is outside this task.

## References

- `docs/product/domain-model.md#course`
- `docs/product/course-structure.md#course-structure`
- `docs/product/representative-scenarios.md#m-new-course`
