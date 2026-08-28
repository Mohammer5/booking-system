# Process

Process docs define how repository documentation is maintained, how
development work is tracked and verified, and how releases are promoted.

## Documents

### Process Overview
- Path: `docs/process/README.md`
- Summary: Human entrypoint for the documentation-process area and its mental
  model.
- Read when: You need to understand how the process documents fit together.
- Tags: docs, process, overview, mental-model

### Process Status
- Path: `docs/process/_status.md`
- Summary: Current process rules, layered Admin/Course-structure,
  Participant-registration, and application-shell verification, active state,
  and known gaps.
- Read when: You need the present-state view of the docs or tracking process.
- Tags: docs, process, status, current-state

### Process Decisions
- Path: `docs/process/_decisions.md`
- Summary: Rationale for documentation structure, canonical `pnpm check`,
  layered tests, GitHub Actions CI/CD authority independent of local Nix
  tooling, tag-gated releases, and deferred deployment automation.
- Read when: You need to understand why process responsibilities are separated
  or why verification, testing, CI ownership, release gates, merge/deployment
  separation, local-tooling/CI ownership, or delayed automation have their
  current shape.
- Tags: docs, process, decisions, rationale, verification, testing, ci-cd,
  releases, nixos

### Conceptual Simplicity
- Path: `docs/process/conceptual-simplicity.md`
- Summary: Defines anti-complecting rules for code, terminology, docs structure,
  and system-part boundaries.
- Read when: A task affects architecture, module boundaries, terminology,
  system decomposition, or docs structure.
- Tags: docs, process, simplicity, complexity, boundaries

### Development Project Tracking
- Path: `docs/process/project-tracking.md`
- Summary: Defines Markplane ownership, work selection, status, relationships,
  and the task-scoped commit lifecycle.
- Read when: A task creates, selects, sequences, updates, completes, or commits
  tracked project work.
- Tags: process, planning, backlog, markplane, commits

### Verification
- Path: `docs/process/verification.md`
- Summary: Defines the layered regression harness, canonical `pnpm check`
  contract, NixOS local browser provisioning, pull-request CI, responsive
  shell/Course-structure/Participant browser and accessibility-test policy,
  and external branch protection requirement.
- Read when: A task affects tests, CI, required checks, test environments,
  browser automation, local test-tool provisioning, verification commands, or
  failure artifacts.
- Tags: process, verification, testing, accessibility, axe, ci, vitest,
  playwright, nixos

### Releases
- Path: `docs/process/releases.md`
- Summary: Defines tag-gated releases, main-containment validation, hosted
  staging verification, production promotion, deployment authority, and
  secret handling.
- Read when: A task affects release tags, deployment, staging, production,
  Cloudflare credentials, migrations during rollout, or smoke checks.
- Tags: process, release, deployment, staging, production, github-actions

### Docs Routing
- Path: `docs/process/docs-routing.md`
- Summary: Defines global docs routing through structured `_index.md` entries.
- Read when: A task changes doc discovery, routing behavior, index shape, or
  minimum-sufficient document selection.
- Tags: docs, routing, indexing, read-when, discovery

### Docs System
- Path: `docs/process/docs-system.md`
- Summary: Defines global indexed docs, optional co-located docs, and their
  maintenance expectations.
- Read when: A task changes documentation ownership, index maintenance, or the
  relationship between global and co-located docs.
- Tags: docs, system, maintenance, global-docs, colocated-docs

### Dictionary
- Path: `docs/DICTIONARY.md`
- Summary: Defines canonical repository terminology and its maintenance model.
- Read when: A task depends on terminology consistency or introduces, renames,
  redefines, or removes important terms.
- Tags: docs, dictionary, terminology, glossary

### Colocated Docs
- Path: `docs/process/colocated-docs.md`
- Summary: Defines naming, purpose, and conservative maintenance rules for
  optional `*.docs.md` files next to concrete files.
- Read when: A task involves co-located docs or deciding where file-specific
  documentation belongs.
- Tags: docs, colocated, module-docs, file-docs, maintenance

### Transitional Docs
- Path: `docs/process/transitional-docs.md`
- Summary: Explains safe work in repositories only partly normalized toward the
  indexed global docs model.
- Read when: A repository has legacy docs, missing indexes, or mixed patterns.
- Tags: docs, transitional, legacy, migration, normalization
