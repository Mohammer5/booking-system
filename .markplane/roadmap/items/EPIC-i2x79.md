---
id: EPIC-i2x79
title: Course content lifecycle
status: later
priority: medium
started: null
target: null
related:
- EPIC-bh5dj
- EPIC-ziadc
tags:
- course
- lifecycle
- scheduling
created: 2026-08-27
updated: 2026-08-27
---

# Course content lifecycle

## Objective

Complete Active Course, Group, and Module editing/lifecycle behavior and the
terminal read-only Course archival boundary. Preserve definite time semantics,
retained participation history, stable identities, and exact deletion rules
through complete Admin/Participant browser slices.

## Key Results

- [ ] KR1: Course fields/timezone and Group/Module edits obey every active,
      timezone-freeze, DST, start/end, cancellation, and uniqueness rule.
- [ ] KR2: Group and Module lifecycle/deletion actions protect exactly the
      retained Selection references required by the product contract.
- [ ] KR3: Course archival is terminal and structurally read-only while Admin
      inspection, eligible Participant history, and access revocation remain
      usable and verified.

## Notes

Tasks are split by coherent lifecycle boundary so each can ship one vertical
capability and focused commit. Deterministic clocks/definite instants are
mandatory; sleeps, recurrence, capacity, conflict prevention, and Course hard
deletion are excluded.
