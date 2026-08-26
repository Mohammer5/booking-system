---
id: TASK-6tfxd
title: Create Groups and future Modules
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on:
- TASK-ubm2q
blocks:
- TASK-qk47b
related: []
assignee: null
tags: []
position: a2
created: 2026-08-27
updated: 2026-08-27
---

# Create Groups and future Modules

## Description

Allow an Active Admin User to configure enough structure in an Active Course
for Module participation by creating Course-wide Groups and future Scheduled
Modules. Each included creation capability must preserve its complete
canonical contract even though later lifecycle operations remain deferred.

## Acceptance Criteria

- [ ] An Active Admin User can create an Active, permanently Course-owned
      Group with a required name that is non-blank after trimming and optional
      free-text details.
- [ ] Active Group names are unique within the Course after trimming and
      case-insensitive comparison, and each created Group is a Course-wide
      choice rather than Module-specific structure.
- [ ] An Active Admin User can create a Scheduled Module in an Active Course
      with a required non-blank title, optional description, optional
      instructions, and definite `startsAt` and `endsAt` instants.
- [ ] Module creation succeeds only when `startsAt > now` and
      `endsAt > startsAt`; schedule input uses the Course's IANA/TZDB timezone,
      rejects nonexistent DST local times, and requires explicit
      disambiguation of ambiguous local times.
- [ ] The first successfully created Module permanently freezes the Course
      timezone, while refused creation does not claim a successful Module
      outcome.
- [ ] Creating a Module does not implicitly create a Module Selection.

## Notes

Group archival, reactivation, and deletion; Module rescheduling, cancellation,
and deletion; and Course archival are outside this task.

## References

- `docs/product/domain-model.md#group`
- `docs/product/domain-model.md#module`
- `docs/product/course-structure.md#course-timezone`
- `docs/product/course-structure.md#groups`
- `docs/product/course-structure.md#modules`
- `docs/product/representative-scenarios.md#n-course-timezone-and-dst`
- `docs/product/representative-scenarios.md#o-backdated-module-refusal`
