## Repo Rules

### Task Scope

* Never infer product implementation work. Only modify product code when the
  latest user prompt explicitly requests it.
* Treat canonical docs as repository truth and `.markplane/` as planning state.
  A backlog item never authorizes implementation by itself.

### Docs Workflow

* For every substantive prompt, first use the `global-docs-router` skill.
* Follow the documentation model and maintenance rules under `docs/process/`.
* When reading a concrete source or configuration file, use the
  `colocated-docs-reader` skill to check for an adjacent `*.docs.md` file.
* When modifying global documentation, use the `global-docs-maintainer` skill
  and keep `_index.md` routing complete.
* Persist every accepted decision that materially affects product behavior,
  constraints, architecture, terminology, or direction in its canonical doc.
* When important terminology changes, use the
  `business-dictionary-maintainer` skill and maintain `docs/DICTIONARY.md`.
* When modifying a concrete source or configuration file, use the
  `colocated-docs-maintainer` skill to update an affected adjacent
  `*.docs.md` file when one exists.
* Never create a co-located `*.docs.md` file unless the user explicitly asks.

### Architecture

* Read `docs/architecture/_index.md` when a task affects source layout,
  packages, modules, dependencies, exports, ESLint, or boundary maps.
* Keep architecture docs and ESLint enforcement aligned in the same change.
* Organize the architecture around product concepts. Keep technical mechanisms
  private to application composition or internal adapters.
* Treat each workspace's `boundaries.config.mjs` as its explicit local
  dependency map and update `docs/architecture/boundaries.md` with every map
  change.
* Register every workspace boundary map explicitly in `eslint.config.mjs`.
* Use explicit allow-lists. Never infer allowed imports from directories or
  package manifests, and never weaken deny-by-default behavior for convenience.
* Do not add a separate architecture checker, fitness function, configuration,
  fixture, script, command, or documentation surface. ESLint is the sole
  mechanical architecture enforcement surface.

### Project Tracking

* Treat `.markplane/` as the canonical development backlog for epics, tasks,
  dependencies, plans, and project notes.
* For status or work selection, read `.markplane/.context/summary.md` first,
  then route to the smallest relevant item set.
* Use Markplane MCP tools or the CLI for IDs, metadata, status, and
  relationships. When editing an item body directly, set `updated` to the
  current date, then run `markplane sync` and `markplane check`.
* Never use this repository's `.markplane/` project as product runtime state or
  as a product-facing ticket store.

### Commits

* After completing and verifying authorized work, commit it automatically
  unless the user explicitly asks otherwise.
* Keep each commit to one conceptual change.
* A commit representing a Markplane task ends its subject with that task ID,
  for example `docs(product): define reporting (TASK-xxxxx)`.
