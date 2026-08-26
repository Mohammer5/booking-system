# Process

Process docs define how repository documentation is structured, routed, and
maintained, and how development work is tracked.

## Documents

### Process Overview
- Path: `docs/process/README.md`
- Summary: Human entrypoint for the documentation-process area and its mental
  model.
- Read when: You need to understand how the process documents fit together.
- Tags: docs, process, overview, mental-model

### Process Status
- Path: `docs/process/_status.md`
- Summary: Current process rules, active state, and known gaps.
- Read when: You need the present-state view of the docs or tracking process.
- Tags: docs, process, status, current-state

### Process Decisions
- Path: `docs/process/_decisions.md`
- Summary: Rationale for separating routing, mental-model, status, rationale,
  terminology, and planning responsibilities.
- Read when: You need to understand why the process has its current structure.
- Tags: docs, process, decisions, rationale

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
