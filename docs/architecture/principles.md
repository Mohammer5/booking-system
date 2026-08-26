# Architecture Principles

## Product Concepts Define The Architecture

Names visible in packages, public interfaces, commands, results, and core flows
come from the product. Runtimes, providers, frameworks, transports, databases,
and developer tools implement those concepts; they do not own peer domains.

## Dependencies Point Toward Conceptual Language

Technical adapters translate external mechanics into capabilities expressed by
the owning conceptual package. Domain code never depends on provider messages,
credentials, object identifiers, engine state, native commands, or transport
shapes.

## Conceptual Simplicity Beats Convenience

Simplicity means distinct concerns are not braided behind one boundary.
Familiarity, proximity, compactness, shared sequence, or use of the same tool
does not justify combining responsibilities.

## One Boundary Owns One Concept

Each function, file, directory, module, package, application, or focused doc
owns one concept, role, task, or dimension. A sequence may be one concept when
the sequence itself is the owned responsibility.

## Compose Distinct Parts At Application Roots

Applications join domain behavior and technical capabilities explicitly.
Concrete behavior stays with its owner; executable entrypoints remain thin and
do not become hidden service locators or business-policy owners.

## Prefer Late Extraction

Create a shared abstraction or package only after repeated concrete use proves
one owner and one change pressure. Small local duplication is acceptable when
it protects conceptual ownership.

## Optimize For Current Constraints

Do not distort ownership, runtime shape, or data flow for speculative scale,
performance, portability, or reuse. Require measured need or an accepted
current constraint.

## Keep Source Machine-Legible

Use small files, explicit imports, searchable named exports, plain data, pure
public interfaces, visible dependency direction, and instruction-shaped
functions.

## Keep Docs And Enforcement Aligned

Docs define the architecture. ESLint repeatedly checks mechanically expressible
rules. A rule or boundary-map change updates its canonical docs in the same
change.
