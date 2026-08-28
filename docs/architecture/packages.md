# Packages

Packages are conceptual domain boundaries, not deployment units or collections
of technical reuse.

## Current Inventory

One conceptual package workspace exists: `@booking-system/booking` at
`packages/booking`.

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

The accepted package scope contains four focused conceptual responsibility
modules:

- `admin-access` for Admin User identity and lifecycle, Super Admin authority,
  first Admin bootstrap, Admin Invites, and Admin onboarding policy;
- `course-structure` for Course structure and lifecycle;
- `course-access` for Participant identity, profile and global access policy,
  Course access, and membership; and
- `module-participation` for Module participation.

All four responsibility modules now exist in source.
The first implements the first Admin bootstrap subset; the second implements
Active Course, Course-wide Group, and future Scheduled Module creation,
including normalized Group names, IANA-zone local-time resolution, explicit
DST-overlap choice, definite instants, and current Admin/Course acceptance
outcomes. `course-access` now implements fresh Participant-context resolution,
explicit Participant registration with complete trimmed-email policy, direct
Course Assignment for registered Active or Disabled targets, and current
Active Participant + Active Assignment + Active Course list/detail access.
Invite, profile-editing, Assignment/Participant lifecycle, and Archived-Course
access stay with that owner when implemented. `module-participation` implements
Participant Selection eligibility, replacement, removal, and derived
current-versus-historical presentation; later Admin-assisted behavior remains
with that owner. These are internal
responsibility modules within one booking package, not separate workspace
packages.

Authentication-provider SDK mechanics, browser UI implementation, HTTP, Vite,
Cloudflare, D1, SQL uniqueness enforcement, and schedule-input presentation
remain private to `apps/booking-system-web`; the four implemented modules own
only their product policy and conceptual outcomes.

The same prohibition covers Better Auth, OAuth/provider SDKs, cookies,
sessions, Cloudflare authentication integration, and non-production
test-authentication machinery. The package receives only the stable external
principal and application-context operation expressed through its conceptual
interfaces, then evaluates domain identity and authorization against current
state.

`packages/booking` has one package manifest for the whole conceptual package.
Its dependencies must remain consistent with booking-domain
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
`common`, `functional`, `ui`, provider, transport, `contracts`, or
all-contracts packages either. Extract a package only when a stable conceptual
owner and independent change pressure justify the workspace boundary.
