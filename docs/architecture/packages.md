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
  first Admin bootstrap, Admin Invites/onboarding, and current Admin User
  directory/name-edit policy;
- `course-structure` for Course structure and lifecycle;
- `course-access` for Participant identity, profile and global access policy,
  Course access, and membership; and
- `module-participation` for Module participation.

All four responsibility modules now exist in source.
The first implements first Admin bootstrap plus Admin Invite creation,
non-secret listing, terminal revocation, minimal recognition, explicit-name
claim, current/deleted-principal, and ordinary-Admin onboarding policy while
also implementing current Admin User listing, name validation, and self/
ordinary/Super edit authorization. Promotion and Admin User lifecycle
management remain deferred; the second implements
Active Course creation and complete editing, permanent first-Module timezone
locking, Course-wide Group creation/complete editing/archival/reactivation/
permanent deletion,
and future Scheduled Module creation, lifetime descriptive editing, strictly
pre-start rescheduling, terminal before-end cancellation, and permanent
unreferenced deletion plus terminal no-rewrite Course archival,
including normalized Group names, IANA-zone local-time resolution, explicit
DST-overlap choice, definite instants, the exact retained-Selection archival
and deletion blockers, current-start schedule locking, Selection deadline
retention, state-only cancellation with retained Selection history, and
reference-protected deletion with permanent Course timezone history, plus
current Admin/Course acceptance outcomes. `course-access` now
implements fresh Participant-context resolution,
explicit Participant registration with complete trimmed-email policy, direct
Course Assignment plus retained-row revocation/reactivation for registered
Active or Disabled targets, and current Active Participant + Active Assignment
+ Active or Archived Course list/detail access. It
also implements Active-Participant self profile editing and Active-Admin edits
of Active/Disabled Participant profiles with the same complete-email policy,
plus guarded global Participant Disable/Re-enable with exact Selection
retention and fresh access effects. It also implements the one-current shared
Course Invite lifecycle, minimal recognized-Invite visibility, and explicit
Active-Participant Join policy for missing, Active, or Revoked Assignment
state, without token, persistence, or browser mechanics. `module-participation` implements
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
