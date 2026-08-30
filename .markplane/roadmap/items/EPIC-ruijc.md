---
id: EPIC-ruijc
title: Normalize Admin collection and detail navigation
status: now
priority: high
started: 2026-08-30
target: null
related: []
tags: []
created: 2026-08-30
updated: 2026-08-30
---

# Normalize Admin collection and detail navigation

## Objective

Normalize the authenticated administration experience around independently useful
resource collections and focused resource details. The browser, Worker/D1 reads,
canonical documentation, and regression evidence must agree on URL-owned list
state, Course-owned nested resources, responsive navigation, and retained domain
invariants.

## Key Results

- [ ] Every accepted Admin collection/create/detail route is direct-navigation and
      refresh safe behind one Active-Admin-only responsive navigation layout.
- [ ] All seven collection reads validate, filter, sort, count, and paginate in
      D1, and every collection view restores normalized state from its URL.
- [ ] Course detail transfers linked retained counts rather than complete child
      collections, while Participant, Group, Module, Admin User, Invite, Course,
      authentication, and lifecycle behavior retains comprehensive regression
      evidence.

## Notes

The accepted information architecture in `.instructions/0001.md` supersedes the
old embedded browser conventions but not the product-domain invariants. No schema
migration is expected; indexes require demonstrated query need and migration
coverage. Each child task is committed separately with its task ID.
