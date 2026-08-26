# Architecture Overview

Architecture is organized around product concepts. Technical mechanisms
implement those concepts behind application composition and private adapters;
they are not first-class domains or package names.

The model is:

- domain docs define product language and ownership;
- conceptual packages own that language and its rules;
- applications compose deployable experiences and effect implementations;
- technical providers remain replaceable at the edge; and
- ESLint enforces explicit deny-by-default package and module dependencies.

The project has now selected one Worker-based web application, Vite-built
static assets, and D1 persistence as its target runtime shape, while still
having no product implementation or workspace. No conceptual package,
dependency edge, or exact source layout has been declared. Read
[principles.md](principles.md) for the philosophy,
[module-organization.md](module-organization.md) for source shape, and
[boundaries.md](boundaries.md) for the executable dependency model. Read
[runtime-and-hosting.md](runtime-and-hosting.md) and
[persistence.md](persistence.md) for the accepted technical direction and the
boundary between decisions and current implementation.
