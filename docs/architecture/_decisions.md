# Architecture Decisions

## Make Conceptual Domains First-Class

Conceptual packages represent stable product areas and own their domain
language, rules, and contracts. Distinct responsibilities within one coherent
area remain focused internal modules when separate workspace boundaries would
add no independent ownership. Technical mechanisms do not become peer packages
merely because several callers use them.

## Let Applications Own Technical Composition

Applications are deployable boundaries. They translate transport, process,
provider, persistence, and runtime mechanics into conceptual capabilities and
inject those capabilities at composition roots. Domain packages do not import
provider SDKs.

## Deploy One Same-Origin Worker Application Initially

`apps/booking-system-web` composes the browser/Vite experience, frontend
assets, Worker request handling, `/api/*`, technical adapters, and the
composition root inside one Cloudflare Worker deployment. This avoids an
unproven `apps/api` deployment boundary and its independent release and CORS
coordination. The application keeps a product-facing identity; Cloudflare,
Vite, and D1 remain private technical mechanisms.

## Align Package Manifests With Workspace Boundaries

One workspace owns one package manifest. Internal responsibility modules do
not receive separate manifests merely because they use different technical
dependencies. The root manifest owns repository-wide tooling and orchestration;
the `apps/booking-system-web` manifest owns dependencies for the whole
deployable application; and the `packages/booking` manifest owns
own only dependencies consistent with the booking domain package.

Browser and Worker/API dependencies may therefore coexist in the one
application manifest. That shared declaration means only that the workspace's
build, runtime, and tooling environment can resolve them. It neither permits
every source module to import them nor places them in every output: the
workspace boundary map grants architectural import permission, while the
source/build graph rooted at each runtime determines output inclusion.
Dependency segregation by itself does not justify frontend, API, browser,
server, or other technical workspaces; application extraction requires an
independent runtime or deployment boundary, and package extraction remains
driven by stable conceptual ownership and change pressure.

## Start With One Booking Domain Package

`packages/booking` is the initial conceptual package. It owns booking-system
language, rules, and contracts while Admin access, Course structure, Course
access, and Module participation remain distinct internal responsibility
modules. Admin User and Admin Invite policy has its own change pressure from
Participant Course access, but both responsibilities remain part of the same
coherent booking domain. Making each focused specification a workspace package
would confuse documentation boundaries with deployment and package ownership.

## Use Focused Browser Libraries With Distinct Responsibilities

The browser UI framework is React, with `react` and `react-dom` as its
foundational dependencies. The browser uses `react-router` for navigation
and URL-to-view mapping, `@tanstack/react-query` for server state, and
`react-hook-form` for transient form mechanics. React Router starts in
Declarative Mode rather than making its loaders and actions the primary
server-state architecture. When concrete source needs them, `classnames` is
used directly for conditional classes and `debug` is the application-level
diagnostic mechanism without a pre-emptive wrapper framework. Neither optional
dependency is needed by the first slice.

These choices remain inside the browser responsibility of the one
`apps/booking-system-web` application. Distinct library responsibilities and
dependency graphs improve local reasoning without creating frontend, API,
Admin, Participant, UI, or other technical workspaces or packages. Detailed
ownership rules live in [browser conventions](browser-conventions.md).

## Use Material UI As The Browser Component Foundation

The browser uses Material UI (MUI) as its mature component library and visual
foundation. MUI remains a browser-facing implementation choice inside the one
`apps/booking-system-web` application: it does not enter `packages/booking`,
Worker-side domain authorization, persistence, or authentication
responsibilities, and its application-manifest declaration does not grant an
import edge outside the browser graph.

The repository owns one cohesive theme and accessibility baseline over free
MUI Core components. Familiar Material interaction patterns, responsive
layout, visible focus, semantic labeling, keyboard operation, predictable
focus management, and non-color-only communication take precedence over novel
navigation or bespoke primitives. This direction does not create a competing
design-system package or justify wrappers around every MUI component. Shared
presentation abstractions require repeated concrete use and one clear owner.

MUI X Community components may be introduced only for a concrete browser need
that MUI Core does not meet, such as accessible date/time entry. Pro, Premium,
or other commercially licensed components are not accepted for the v1 local
application. The implemented foundation pins free MUI Core and its Emotion
styling dependencies in the application manifest and grants exact MUI import
permissions only to browser-facing source and the browser composition root.

## Build Internationalization Into The First Frontend Slice

The browser uses `i18next` and `react-i18next` from its first real slice,
with German initially and stable semantic translation keys. Domain outcomes
remain language-neutral, route paths remain locale-independent, and browser
code owns localized presentation. This avoids hard-coding the initial language
into component and domain boundaries while deferring concrete resource and
namespace layout until implementation.

## Use Domain-Oriented Functional Composition

JavaScript favors [domain-oriented functional
composition](../DICTIONARY.md#domain-oriented-functional-composition): plain
data, instruction-shaped workflows, explicit narrow capability injection,
visible decisions, and late abstraction inside existing vertical slices.
Ramda is accepted for that style in browser/application code,
runtime-compatible Worker/application workflows, and `packages/booking` domain
code where it improves conceptual clarity, with `pipe` preferred when
left-to-right composition clarifies the runtime story. A workspace declares
Ramda only when real source uses it, and the owning responsibility still needs
an explicit boundary-map permission.

Functional style does not create a peer architecture, generic functional
layer, service locator, effect system, or universal Result wrapper. Existing
conceptual ownership and dependency direction remain authoritative; plain
`async`/`await` and ordinary branching are preferred whenever they make the
owned behavior clearer.

## Use Cloudflare As The Initial Runtime Boundary

Cloudflare Workers, Workers Static Assets, and D1 form the smallest accepted
hosting footprint. Designing for small-scale use within Cloudflare's free
hosting and database quotas constrains unnecessary infrastructure without
turning changeable quota numbers or unrelated external costs into correctness
rules.

## Defer Remote Infrastructure Provisioning Until Release Hardening

Cloudflare Workers, Workers Static Assets, and D1 remain the accepted
production architecture from the beginning of implementation. Real
application work therefore uses the actual Worker/D1-compatible local
toolchain, configuration, and semantics required by implemented behavior; it
must not quietly become a conventional long-running Node server or use an
unrelated persistence architecture.

Account-bound Cloudflare resources are intentionally deferred until the MVP is
feature-complete and accepted locally. That later [release-hardening
phase](../DICTIONARY.md#release-hardening) provisions the remote deployment
environments and configuration needed to exercise the already-compatible
application in real staging and production infrastructure. This avoids
premature operational work without blocking local product implementation or
postponing architectural compatibility. The decision changes provisioning
timing, not the accepted technology.

## Use D1 With SQLite Semantics For Deployed Persistence

SQLite-compatible SQL gives the relational model one clear semantic basis,
while D1 provides durable storage in the Workers environment. Separate local,
staging, and production data protects production from destructive regression
tests and makes pre-production verification meaningful.

## Model First Admin Bootstrap As A Permanent Atomic Claim

Bootstrap availability represents whether the installation has ever created
an Admin User, so current Admin User rows cannot reconstruct it after
legitimate deletion. Persisting that history independently prevents
administration bootstrap from reopening. Creating the first Active Super Admin
and consuming bootstrap are one atomic authoritative claim so stale or
concurrent requests cannot leave partial state or create two first
administrators.

## Use Better Auth With D1-Backed Opaque Sessions

Better Auth runs inside `apps/booking-system-web` and uses the application's
D1 database. This fits the accepted Worker and D1 footprint without another
identity service, while database-backed opaque sessions remain simple and
revocable. The session establishes only one stable external principal;
Participant/Admin resolution and every authorization decision use authoritative
current booking-domain state instead of session claims.

Collapsing application authentication to `externalPrincipalId` keeps Better
Auth and provider mechanics private and prevents technical session data from
becoming booking identity or authority. A principal can therefore continue to
back an Admin User, Participant, both, or neither without role selection in the
session.

Implicit provider linking is disabled in v1 to avoid accidental identity
merging. The first epic uses a separately composed, explicitly non-production
Better Auth mechanism to establish normal sessions for deterministic fixture
identities. Production must be structurally unable to activate that mechanism;
Google is now the normal locally implemented provider outside that epic, while
Apple, Microsoft, Facebook, remote production credentials, and production
callback/domain configuration remain deferred. Both implicit and manual
account linking are disabled explicitly in Better Auth configuration.
Structural composition, rather than a production runtime flag, makes the
fail-closed property independently verifiable and prevents a hidden test route
from becoming an authentication bypass.

## Continue Course Invites With A Signed Digest Session

After first raw fragment recognition, Course Invite continuation uses an
application-issued `HttpOnly` session cookie containing only the recognition
digest and an HMAC-SHA-256 signature. The signing key is purpose-derived from
the required environment-owned Better Auth secret through Worker Web Crypto.
This reuses existing high-entropy deployment key material without treating the
authentication session as Invite authority or adding another secret, database
table, pending domain record, or generic continuation framework.

The cookie is session-lived, `SameSite=Lax`, root-scoped, and `Secure` on
HTTPS, so it survives the fixed top-level Google callback while remaining
unavailable to browser JavaScript. Join stays a separate body-free request
that revalidates the digest and current domain state. This design prevents the
raw token from entering provider URLs and preserves the product rule that
recognition, authentication, and onboarding do not create membership.

## Keep Node Tooling Separate From The Worker Runtime

Node.js remains the repository tooling, build, and CI runtime. Application
JavaScript may use Node-compatible packages when justified, but production is
not modeled as a conventional long-running Node server. This prevents local
Node execution from being mistaken for proof of Workers-runtime behavior.

## Use Nix For NixOS Developer Host Tooling

The repository-root flake owns reproducible developer-host executables for
x86_64-linux: Node 24, pnpm 11.17.0, Git, Markplane, Chromium, and the exact
workerd runtime resolved by the pnpm lockfile. The official workerd Linux
binary is patched as a Nix derivation and selected through
`MINIFLARE_WORKERD_PATH`, so NixOS developers do not need global `nix-ld`, an
FHS environment, or mutable `node_modules` repair.

Nix does not become another application runtime or dependency owner. Wrangler,
Vite, Vitest, Better Auth, Cloudflare plugins, React, and the rest of the
project graph remain pnpm-pinned; Vite, Miniflare/workerd, and local D1 retain
their existing Cloudflare-native semantics. Docker is not a parallel local
environment.

## Keep Contracts With Their Concepts

Each conceptual package owns the schemas, commands, results, and events that
express its language. A central contracts package would braid unrelated
domains and make serialization concerns appear architecturally primary.

## Prefer Late Package Extraction

Shared technical helpers remain local until repeated concrete use proves one
owner and change pressure. `shared`, `core`, `utils`, and provider-named
packages are not default escape hatches. A crowded manifest or differing
technical dependency sets are not evidence of an independent package owner.

## Keep Boundary Maps Local, Explicit, And Deny-By-Default

Each workspace owns an allow-list and explicitly declares the package namespace
whose undeclared imports it rejects. Package manifests and folders never grant
an architectural edge. Composition files receive explicit permissions.

## Declare Workspaces Only From Accepted Product Boundaries

Example applications, packages, or domain names can look authoritative before
a product boundary is accepted. The repository therefore kept its implemented
workspace inventory empty until explicitly authorized, while testing
enforcement with synthetic names. The accepted `apps/booking-system-web` and
`packages/booking` workspaces now exist with real behavior and explicit maps.

## Introduce Runtime Tooling With A Real Application

Runtime and test dependencies, local bindings, migrations, and project
configuration arrive with code and tests that use them. Deferring empty
scaffolding keeps the current repository honest while requiring application
implementation to bring the applicable local Worker/D1-compatible runtime and
verification surfaces with it. Account-bound resources and deployment
automation arrive during release hardening, when they can deploy and verify a
locally accepted MVP rather than fictional infrastructure.

## Use ESLint As The Sole Enforcement Surface

Normal `pnpm lint` checks source shape, imports, cycles, public interfaces, and
every explicitly registered workspace map. The boundary converter is tested
separately through the same ESLint integration. No secondary architecture
checker or inferred dependency graph exists.

## Keep Framework Exceptions Narrow

Only exact tool configuration files that require default exports receive an
exception. Product source uses named exports, and provider or framework
exceptions remain private and documented.
