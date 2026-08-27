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
from current domain state. Google is the implemented normal provider for the
local application; its provider mechanics and environment-owned credentials
remain inside the application boundary.
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

The application and booking workspaces, Worker/Vite/D1 runtime, Better Auth
session and Google sign-in composition, first-Admin vertical slice, explicit
boundary maps, and verification surfaces are implemented locally. The later
booking responsibility modules shown above remain accepted targets rather than
source until their slices are delivered. Read [principles.md](principles.md)
for the philosophy, [module-organization.md](module-organization.md) for the
implemented source shape, and [boundaries.md](boundaries.md) for executable
dependencies. [Architecture status](_status.md) distinguishes this local
foundation from still-absent remote and release surfaces.
