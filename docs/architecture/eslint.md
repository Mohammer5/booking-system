# ESLint Enforcement

ESLint is the sole mechanical architecture enforcement surface. It keeps source
small, interfaces explicit, dependency direction visible, and workspace access
deny-by-default.

## Source Shape Rules

- file, function, parameter, and statement budgets;
- cycle rejection and named-export defaults;
- pure explicit `index.js` interfaces;
- non-exporting executable entrypoints;
- filename and primary-export alignment;
- `is`/`has` Boolean names;
- JSDoc for module-scope named functions; and
- explicit class exceptions for stateful resources and imperative adapters.

These rules target the implemented `apps/*/src/` and `packages/*/src/` files.
`eslint-plugin-react` contributes only JSX variable-use recognition so the
existing unused-variable rule remains meaningful for React source.

## Dependency Boundaries

`eslint-plugin-boundaries` receives one exact map from every declared
workspace. Per-workspace settings classify only declared responsibility
modules, composition files, and tests. Unknown production files and undeclared
edges are errors.

The helper under `eslint-boundaries/` converts explicit maps into ESLint
configuration. It never scans directories or manifests to invent nodes,
dependencies, package permissions, package namespaces, or composition rights.

Both implemented local maps are imported in `eslint.config.mjs`, with one
explicit `createWorkspaceBoundaryConfig` entry for `packages/booking` and one
for `apps/booking-system-web`.

The converter permits exact third-party specifiers per responsibility or
composition file, exact workspace dependencies within the workspace-wide
allow-list, exact nested module interfaces for composition, and exact test-only
dependencies and composition imports. All ordinary undeclared third-party
imports remain denied from production source. Permissions are never inferred
from manifests.

## Tests And Tooling

The synthetic boundary-converter suite proves undeclared workspace and
third-party packages fail, package subpaths fail, local declarations cannot
bypass the workspace-wide allow-list, owning-responsibility and composition
permissions are exact, nested composition interfaces are exact, test
composition access is explicit, and test dependencies remain unavailable to
production. The local-rule suite checks every custom source-shape rule. Tests
disable only code-size budgets. Tooling receives Node globals and normal
syntax, unused-variable, cycle, and named-export checks where applicable.

Exact default-export exceptions exist only for tool-mandated configuration
files (`eslint.config.mjs`, the Vite, Vitest, and Playwright configs) and the
two Cloudflare Worker module entrypoints. All other production source retains
the named-export default.

## No Secondary Checker

Do not add architecture fitness functions, a separate architecture-check
command, duplicate dependency graphs, or filesystem-scanning enforcement.
Extend ESLint and the explicit workspace maps when a mechanically enforceable
rule is needed.

## Maintenance

A lint rule or boundary-map change updates its canonical architecture doc in
the same commit. Prefer one explicit edge over a broad pattern or weakened
default.
