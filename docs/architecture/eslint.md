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

These rules already target future `apps/*/src/` and `packages/*/src/` files.

## Dependency Boundaries

`eslint-plugin-boundaries` receives one exact map from every declared
workspace. Per-workspace settings classify only declared responsibility
modules, composition files, and tests. Unknown production files and undeclared
edges are errors.

The helper under `eslint-boundaries/` converts explicit maps into ESLint
configuration. It never scans directories or manifests to invent nodes,
dependencies, package permissions, package namespaces, or composition rights.

For every implemented workspace, import its local map in `eslint.config.mjs`
and add one explicit `createWorkspaceBoundaryConfig` entry. With no implemented
workspaces, the repository registers no boundary map; a documented conceptual
target alone does not activate enforcement.

## Tests And Tooling

The synthetic boundary-converter suite proves that undeclared workspace
packages, package subpaths, and undeclared responsibility modules fail while an
exact allow-listed package root succeeds. The local-rule suite checks every
custom source-shape rule. Tests disable only code-size budgets. Tooling receives
Node globals and normal syntax, unused-variable, cycle, and named-export checks
where applicable.

The only default-export exception is `eslint.config.mjs`, whose consumer
requires that shape. Future framework configuration exceptions must be exact
file patterns and documented before use.

## No Secondary Checker

Do not add architecture fitness functions, a separate architecture-check
command, duplicate dependency graphs, or filesystem-scanning enforcement.
Extend ESLint and the explicit workspace maps when a mechanically enforceable
rule is needed.

## Maintenance

A lint rule or boundary-map change updates its canonical architecture doc in
the same commit. Prefer one explicit edge over a broad pattern or weakened
default.
