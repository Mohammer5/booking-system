---
id: EPIC-ifkev
title: Release hardening
status: later
priority: medium
started: null
target: null
related: []
tags: []
created: 2026-08-27
updated: 2026-08-27
---

# Release hardening

## Objective

After the MVP is feature-complete and accepted locally, establish and validate
the account-bound Cloudflare infrastructure and release path required to move
that production-compatible application through real staging into production.
This phase is mandatory before the first production release, but it does not
block normal local MVP implementation or acceptance.

## Key Results

- [ ] KR1: Separate remote staging and production Worker environments and D1
      databases have environment-specific configuration and least-privilege
      deployment credentials.
- [ ] KR2: The tag-triggered release gate re-verifies an eligible `main`
      commit, deploys that same commit to staging, and passes hosted staging
      verification before production promotion is possible.
- [ ] KR3: Production promotion applies rollout-compatible migrations, deploys
      the verified release, and passes only safe non-destructive smoke
      verification.

## Notes

This epic follows the locally accepted MVP and precedes the first production
release. It records the mandatory future phase without prematurely selecting
detailed tasks or attaching an implementation plan. Canonical release,
runtime, persistence, authentication, and verification docs remain
authoritative when this work is selected.
