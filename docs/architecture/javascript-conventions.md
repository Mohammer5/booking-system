# JavaScript Conventions

The architecture tooling targets modern ESM JavaScript in `.js`, `.jsx`, and
`.mjs` files.

## Prefer Plain Data

Represent information with primitives, arrays, and plain objects. Do not create
data classes. Classes are allowed only for a justified stateful resource or
imperative adapter and carry an explicit `@statefulResource` or
`@imperativeAdapter` JSDoc marker.

## Align Filenames And Primary Exports

A file built around one primary function, class, or component uses the same
name as that export. `index.js`, executable `main` files, and narrow data or
configuration files are exceptions.

## Use Instruction-Shaped Functions

Non-trivial application functions compose named operations, intermediate
values, visible predicate branches, and a final result. Lowest-level functions
may remain direct and imperative when they own one simple parse, validation,
transport, format, adapter call, or mutation.

## Name Booleans As Predicates

Mechanically identifiable Boolean values and Boolean-returning functions start
with present-tense `is` or `has`.

## Document Module-Scope Functions

Module-scope named functions have JSDoc. Include `@param`, `@returns`, and
`@throws` when applicable, and describe behavior for a reader who does not
already know the implementation.

## Prefer Named Exports

Application and package code uses named exports. Default exports are restricted
to exact tool configuration cases documented in `eslint.md`.
