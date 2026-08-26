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

This template defines the model and enforcement without preselecting an
application, package, dependency edge, or runtime stack. Read
[principles.md](principles.md) for the philosophy,
[module-organization.md](module-organization.md) for source shape, and
[boundaries.md](boundaries.md) for the executable dependency model.
