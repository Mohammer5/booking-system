# JavaScript Conventions

The architecture tooling targets modern ESM JavaScript in `.js`, `.jsx`, and
`.mjs` files.

## Architecture Before Technique

The canonical implementation shorthand is [domain-oriented functional
composition](../DICTIONARY.md#domain-oriented-functional-composition) inside
vertical slices, with explicit dependencies, instruction-shaped workflows,
visible conceptual decisions, and late abstraction.

Apply that direction in this priority order:

1. Preserve the existing [architecture philosophy](principles.md) and
   [enforcement model](eslint.md).
2. Make conceptual ownership and dependency direction obvious.
3. Make the primary runtime story easy to read locally.
4. Prefer named domain operations and explicit composition.
5. Use functional techniques where they simplify that story.
6. Extract reusable abstractions only after concrete evidence of reuse.

Functional programming is an implementation technique within the existing
architecture, not a peer architecture, layer, framework, package, or generic
subsystem. The objective is conceptual clarity and composability, not maximum
functional programming.

## Prefer Plain Data And Explicit Transformations

Represent information with primitives, arrays, and plain objects. Do not create
data classes or unnecessary behavior-carrying objects. Prefer data-oriented,
explicit transformations while keeping ownership boundaries intact. Classes
are allowed only for a justified stateful resource or imperative adapter and
carry an explicit `@statefulResource` or `@imperativeAdapter` JSDoc marker.

## Align Filenames And Primary Exports

A file built around one primary function, class, or component uses the same
name as that export. `index.js`, executable `main` files, and narrow data or
configuration files are exceptions.

## Use Instruction-Shaped Functions

Non-trivial application functions compose named operations, intermediate
values, visible predicate branches, and a final result. Lowest-level functions
may remain direct and imperative when they own one simple parse, validation,
transport, format, adapter call, or mutation.

Use `pipe`, `compose`, and higher-order functions where they improve local
reasoning, explicit dependency injection, or composition of genuinely shared
concepts. Compose at the level where the sequence itself is a meaningful owned
concept; do not require every function to use a pipeline. For example:

```js
const selectModule = pipe(
  validateRequest,
  resolveParticipant,
  authorizeSelection,
  saveModuleSelection,
  createSelectionResult,
);
```

Named domain and application operations should carry the primary meaning.
Avoid clever point-free code, mechanics-first combinator chains, and
abstractions that require specialized functional-programming knowledge to
understand ordinary application behavior.

## Use Ramda Selectively

`ramda` is the accepted functional helper library when its use is explicitly
available to the owning source responsibility. Prefer named imports and
left-to-right `pipe` for ordinary instruction-shaped orchestration:

```js
import { filter, map, pipe } from "ramda";
```

`compose` remains valid when right-to-left composition is genuinely clearer.
Avoid a generic namespace import such as `import * as R from "ramda"` when
named imports make dependencies clearer.

Do not wrap Ramda functions merely to rename generic mechanics, and do not
create `functional`, `combinators`, `utils`, `common`, or `core` directories or
packages to hold generic functional machinery. Acceptance of Ramda for the
planned browser graph does not grant imports elsewhere; non-browser use
requires a concrete dependency decision and an explicit boundary edge.

## Inject Narrow Capabilities

Higher-order functions are encouraged when they represent meaningful variation
or allow production, test, or simulation adapters to be supplied without
coupling a workflow to infrastructure. Workflow constructors name and accept
only the capabilities they use:

```js
const createSelectModule =
  ({
    loadCourseAccess,
    saveModuleSelection,
  }) =>
  (input) => {
    // Owned workflow.
  };
```

Do not replace those capabilities with a large `services` bag, a hidden global
dependency environment, or implicit context. Function-based dependency
injection must not become a disguised service locator.

## Keep Conceptual Decisions Visible

Do not optimize for zero conditionals. `if`, ternaries, `switch`, and other
straightforward branches remain valid. Put each meaningful decision in the
concept that owns it, even when a higher-level workflow is declarative.

Do not replace readable domain branching with `when`, `unless`, generic chooser
abstractions, or elaborate combinators for stylistic uniformity. Keep the
primary workflow instruction-shaped while meaningful decisions remain visible
inside their owning operations.

## Keep Async Workflows Explicit

Plain Ramda `pipe` is not an asynchronous workflow abstraction. Do not force
effect-heavy workflows into a pipeline or add generic Promise combinators
merely to make asynchronous code resemble synchronous composition. Prefer an
instruction-shaped `async` function with named intermediate results and
explicit `await` whenever it tells the conceptual story more clearly:

```js
const createSelectModule =
  ({
    loadCourseAccess,
    saveModuleSelection,
  }) =>
  async (input) => {
    const selection = validateModuleSelection(input);
    const courseAccess = await loadCourseAccess(selection);
    const allowedSelection = authorizeModuleSelection(selection, courseAccess);

    return saveModuleSelection(allowedSelection);
  };
```

Never use `pipe` merely to make code look functional.

## Use Explicit Outcome Types Only When Useful

Result-, Either-, and Option-like representations are acceptable when they
materially improve explicit failure, optionality, composition, or local
reasoning. They are not universal return wrappers, and simple control flow
does not need containers for ideological consistency. Do not create a generic
monadic or effect library in anticipation of later needs.

## Keep Effects Behind Owned Operations

Prefer explicit capability injection and ordinary composition over generalized
effect systems. Side effects sit behind clearly owned operations or adapters,
while domain transformations remain pure where practical. Purity supports
predictability, testing, and composition; it is not an absolute architectural
requirement.

Do not introduce Free monads, Tagless Final, generalized effect interpreters,
hidden environment or context systems, or similar abstraction-heavy
architectures without a concrete accepted requirement.

## Extract After Evidence

Implement behavior close to its owning concept, observe actual repetition,
confirm that it represents the same concept and change pressure, and extract
only when the abstraction has a clear owner and useful boundary. Small local
duplication is preferable to premature generic abstraction.

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
