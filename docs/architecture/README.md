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

The accepted initial conceptual target is:

```text
apps/
  booking-system-web/

packages/
  booking/
    course-structure/
    course-access/
    module-participation/
```

`apps/booking-system-web` is the single same-origin deployable application. It
composes the browser/Vite experience, static assets, Cloudflare Worker request
handling, `/api/*`, private technical adapters, and the application composition
root.
`packages/booking` is the single initial conceptual domain package; the three
folders shown beneath it are distinct responsibility modules, not separate
workspace packages.

This tree is a conceptual ownership view. When implementation is authorized,
the standard workspace `src/` rule still applies and the three booking names
remain its first-level responsibility modules.

This conceptual target, Worker-based runtime, Vite-built assets, and D1
persistence are accepted but not implemented. No workspace, dependency edge,
boundary map, composition file, package export, or exact internal file layout
exists yet. Read
[principles.md](principles.md) for the philosophy,
[module-organization.md](module-organization.md) for source shape, and
[boundaries.md](boundaries.md) for the executable dependency model. Read
[runtime-and-hosting.md](runtime-and-hosting.md) and
[persistence.md](persistence.md) for the accepted technical direction and the
boundary between decisions and current implementation.
