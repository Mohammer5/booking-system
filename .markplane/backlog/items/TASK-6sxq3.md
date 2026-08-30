---
id: TASK-6sxq3
title: Accept and document the locally complete v1
status: backlog
priority: high
type: chore
effort: medium
epic: EPIC-hikpy
plan: null
depends_on:
- TASK-t8jzz
blocks: []
related:
- EPIC-ifkev
- NOTE-7gbq2
assignee: null
tags:
- acceptance
- documentation
- verification
- release-gate
position: a4
created: 2026-08-27
updated: 2026-08-30
---

# Accept and document the locally complete v1

## Description

Perform and record final local v1 acceptance after every implementation epic
and representative-scenario regression is complete. Align canonical current
status and local operating documentation with the verified application, prove
fresh local setup for both real-Google manual use and deterministic fixtures,
then close local-completion planning before release hardening becomes
selectable.

## Acceptance Criteria

- [ ] README/local setup explains dependency installation, complete fresh D1
      migration preparation, normal `localhost:5173` development, required
      ignored Google/Better Auth configuration, Admin and Participant manual
      Google journeys, sign-out/recovery, and deterministic fixture-server use.
- [ ] Manual guidance never automates Google's hosted UI, exposes secrets, or
      implies fixture authentication exists in production. Apple, Microsoft,
      and Facebook remain explicitly deferred.
- [ ] Canonical architecture status, product implementation status, browser/
      authentication/persistence/verification docs, and affected indexes
      accurately distinguish the complete local application from absent remote
      Cloudflare and release surfaces.
- [ ] A fresh empty local D1 reaches the complete schema through migrations,
      normal manual development starts successfully, deterministic fixture
      setup starts separately, direct-route refresh works, and the final
      documented acceptance journeys are reproducible.
- [ ] The final coverage matrix contains no unmapped normative section or
      scenario A–AI, every local-functional-completion implementation task has
      an owning epic and complete verification evidence, and all
      local-functional-completion epics are closed.
- [ ] `pnpm check` and every stricter canonical planning/docs validation pass
      on the accepted commit. No product dependency, migration, test, or source
      is left undocumented or unverified.
- [ ] `EPIC-ifkev` remains unstarted/later but is explicitly gated by this
      task's completion; only after this task is done may release hardening be
      selected.

## UI/UX Expectations

This task changes documentation/status only as required by completed behavior.
Manual acceptance traverses the real German-first responsive MUI Admin and
Participant experiences at desktop and narrow/mobile widths with keyboard and
visible-focus checks. It does not add a release or test-only product screen.

## Verification Evidence Required

- Fresh local migration, normal development, deterministic fixture-server,
  direct navigation, manual real-Google configuration review, and final
  scenario-acceptance evidence.
- `pnpm check`, `markplane sync`, `markplane check`, documentation/index/
  dictionary coverage checks, and `git diff --check`.
- Final review confirms no remote resource, deployment credential, hosted
  staging test, release workflow, production promotion, or smoke test was
  introduced.

## Out Of Scope / Notes

All remote Cloudflare staging/production infrastructure, secrets, deployment,
release automation, hosted E2E, promotion, and production smoke testing belong
to `EPIC-ifkev`. This task must not begin that epic. Create a fresh
implementation plan when selected.

## References

- `docs/product/_status.md`
- `docs/product/representative-scenarios.md`
- `docs/architecture/_status.md`
- `docs/architecture/authentication-and-sessions.md#current-state-and-implementation-trigger`
- `docs/architecture/persistence.md#current-state-and-persistence-lifecycle`
- `docs/process/verification.md#canonical-repository-command`
- `docs/process/releases.md#current-state-and-release-hardening-trigger`
- `docs/process/project-tracking.md#working-rules`
- `NOTE-7gbq2`
- `EPIC-ifkev`
