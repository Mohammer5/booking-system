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
    admin-access/
    course-structure/
    course-access/
    module-participation/
```

`apps/booking-system-web` is the single same-origin deployable application. It
composes the browser/Vite experience, static assets, Cloudflare Worker request
handling, `/api/*`, private technical adapters, and the application composition
root. Better Auth is the accepted application-private authentication layer,
using D1-backed opaque sessions while booking authorization remains resolved
from current domain state.
`packages/booking` is the single initial conceptual domain package; the four
folders shown beneath it are distinct responsibility modules, not separate
workspace packages.

One application workspace does not mean one undifferentiated runtime or
dependency graph. Browser-facing and Worker/API-facing code remain distinct
internal responsibilities: the workspace manifest declares dependency
availability, explicit boundaries permit source imports, and separate
source/build graphs determine what reaches each output. Read
[applications.md](applications.md), [module-organization.md](module-organization.md),
[boundaries.md](boundaries.md), and
[runtime-and-hosting.md](runtime-and-hosting.md) for those distinctions.
Read [browser conventions](browser-conventions.md) for routing, server-state,
form, diagnostics, localization, and browser-library ownership, and
[JavaScript conventions](javascript-conventions.md) for domain-oriented
functional composition inside vertical slices.
Read [authentication and sessions](authentication-and-sessions.md) for the
technical-principal, session, contextual domain-resolution, and non-production
authentication contracts.

This tree is a conceptual ownership view. When implementation is authorized,
the standard workspace `src/` rule still applies and the four booking names
remain its first-level responsibility modules.

This conceptual target, Worker-based runtime, Vite-built assets, D1
persistence, and Better Auth session architecture are accepted but not
implemented. No workspace, dependency edge, boundary map, composition file,
package export, or exact internal file layout exists yet. Read
[principles.md](principles.md) for the philosophy,
[module-organization.md](module-organization.md) for source shape, and
[boundaries.md](boundaries.md) for the executable dependency model. Read
[runtime-and-hosting.md](runtime-and-hosting.md) and
[persistence.md](persistence.md) for the accepted technical direction and the
boundary between decisions and current implementation.
