# Module Organization

## Workspace Roots

Production code lives under each [workspace's](../DICTIONARY.md#workspace)
`src/` directory. Package manifests, boundary maps, and build configuration
remain at the workspace root.

## Conceptual Packages

Code that expresses product language, policy, invariants, commands, events,
schemas, or outcomes belongs to its conceptual package. A package root exposes
only the language other owners need.

Do not create packages for workflow engines, storage, databases, transports,
providers, browser tools, agents, all contracts, or generic shared code.

## Application Responsibility Modules

First-level application `src/` folders name product capabilities or explicit
application roles. Private technical adapters live beneath the conceptual
responsibility they implement or behind the application's composition root.

Do not organize first by `controllers`, `services`, `helpers`, `utils`,
`models`, `views`, `common`, `core`, `infrastructure`, or provider name.

## Vertical Slices

Second-level folders name use cases or focused change paths. A slice may contain
presentation, validation, policy invocation, and local adapter translation when
they change together, while domain behavior stays in its owning package.

## Keep Conceptual Flow Visible

A bounded use case prefers a primary pass-shaped file whose non-trivial
function reads like instructions: gather inputs, name intermediate values,
branch on predicates, invoke the next operation, and return the result.

Extract a helper only when it independently clarifies the flow, is already
reused, or hides one truly imperative boundary.

## Public Interfaces

Every production source directory exposes `index.js`. It contains only explicit
named re-exports, has no behavior or side effects, and exports only what callers
need.

Cross-module imports target the destination module interface. Imports inside a
module stay local and do not import their parent interface. Cross-workspace
imports use only an explicitly exported package root.

## Executable Entrypoints And Composition

`main.js` and `main.jsx` own startup and export nothing. Declared composition
files may join only the responsibility modules explicitly allowed in that
workspace's boundary map.

Composition translates technical implementations into narrow conceptual
capabilities. It does not contain product policy or expose a service locator.

## Dependency Direction

- Dependencies are explicit, one-way, and cycle-free.
- Technical implementations depend toward conceptual language.
- Domain packages never import application or provider code.
- Relative traversal between workspaces is forbidden.
- Package subpaths are forbidden unless explicitly exported and documented.
- Production code never imports tests.

## Tests

Keep focused tests with the behavior they verify. Tests may receive size-budget
exceptions but remain subject to syntax, import, and boundary linting.
