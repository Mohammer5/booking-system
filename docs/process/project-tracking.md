# Development Project Tracking

## Responsibility

The repository-local [development backlog](../DICTIONARY.md#development-backlog)
under `.markplane/` records planned work, priority, status, dependency order,
implementation plans, and project notes. It gives humans and agents one durable
view of development work.

## Not Responsible For

The backlog is not canonical repository truth, product runtime state, a
product-facing ticket destination, or authorization to implement an item.
Canonical docs remain authoritative.

## Working Rules

- Read `.markplane/.context/summary.md` before selecting work.
- Use Markplane tools for IDs, metadata, status, and relationships.
- Edit item bodies directly only when necessary, update their date, then run
  `markplane sync` and `markplane check`.
- Keep only dependency-ready work planned or active.
- Create detailed plans when complex work is selected, not for speculative
  backlog ideas.
- Keep product runtime records and product-facing tickets outside the
  development backlog.

## Commit Lifecycle

Authorized completed work is committed automatically unless the user asks
otherwise. Each commit owns one conceptual change. A commit for a tracked task
ends with its task ID so history remains connected to the backlog.

## Access

Run from the repository root:

```sh
markplane dashboard
markplane serve --open
markplane sync
markplane check
```

Project-scoped Codex integration lives in `.codex/config.toml` and starts
`markplane mcp`.

## Inputs

Accepted decisions, canonical docs, verified repository state, and explicit
implementation authorization.

## Outputs

Epics, tasks, dependencies, plans, notes, generated indexes, and compact agent
context.

## Adjacent Parts

`AGENTS.md`, the indexed docs workflow, and focused Git commits.
