# Packages

Packages are conceptual domain boundaries, not deployment units or collections
of technical reuse.

## Current Inventory

No package workspace or product source exists. The accepted first conceptual
package target is `packages/booking`.

## Accepted Initial Package

`packages/booking` owns booking-system product language, rules, and contracts
that do not belong to HTTP, Vite, Cloudflare, D1, authentication-provider, or UI
mechanics.

- **Responsibility:** Express and preserve the booking system's domain
  language, invariants, actions, and outcomes.
- **Not responsible for:** Application composition, transport, user-interface,
  persistence, runtime, or provider integration mechanics.
- **Inputs:** Product actions and state expressed through booking-system
  concepts.
- **Outputs:** Conceptual booking rules, contracts, and outcomes for application
  composition.
- **Adjacent parts:** `apps/booking-system-web` and its private technical
  adapters.

The package initially contains four focused conceptual responsibility modules:

- `admin-access` for Admin User identity and lifecycle, Super Admin authority,
  first Admin bootstrap, Admin Invites, and Admin onboarding policy;
- `course-structure` for Course structure and lifecycle;
- `course-access` for Participant identity, profile and global access policy,
  Course access, and membership; and
- `module-participation` for Module participation.

These are internal responsibility modules within one booking package, not
separate workspace packages. Their distinct product-spec documents reflect
distinct conceptual ownership without requiring separate packages.

Authentication-provider SDK mechanics, Admin UI implementation, HTTP, Vite,
Cloudflare, and D1 remain private to `apps/booking-system-web`; `admin-access`
owns only product policy and conceptual outcomes.

When created, `packages/booking` will have one package manifest for the whole
conceptual package. Its dependencies must remain consistent with booking-domain
responsibility and must not pull browser, HTTP, Worker, Vite, Cloudflare, D1,
authentication-provider, or other application/runtime concerns into the
package.

## Definition Rule

Document every conceptual package here when it is introduced. Give it a name
from product language and define its `Responsibility`, `Not responsible for`,
`Inputs`, `Outputs`, and adjacent parts.

Reuse, file count, provider use, or convenience is not sufficient evidence for
a package. Technical dependency segregation and a crowded or mixed-looking
manifest are also insufficient: do not create default `frontend`, `backend`,
`browser`, `server`, `api`, or `database` packages merely to give libraries
separate dependency lists. Do not create default `shared`, `core`, `utils`,
provider, transport, `contracts`, or all-contracts packages either. Extract a
package only when a stable conceptual owner and independent change pressure
justify the workspace boundary.
