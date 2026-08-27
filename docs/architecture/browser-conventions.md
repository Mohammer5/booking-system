# Browser Conventions

These conventions apply to the React-based browser experience inside the
implemented `apps/booking-system-web` application. They refine the existing
architecture; they do not create another application, package, layer, or
ownership model.

## Dependency Scope

React is the accepted browser UI framework. Each of these dependencies is
accepted for introduction to the application workspace when a real browser
slice requires it:

- `react`;
- `react-dom`;
- `react-router`;
- `@tanstack/react-query`;
- `classnames`;
- `react-hook-form`;
- `debug`;
- `ramda`;
- `i18next`; and
- `react-i18next`.

The first Admin slice uses React, React DOM, React Router, TanStack Query, React
Hook Form, i18next, and react-i18next. It does not declare `classnames`, `debug`,
or `ramda` because no current source needs them. Acceptance here grants neither
an import edge nor inclusion in every application output: the application
[boundary map](../DICTIONARY.md#boundary-map) and each runtime source/build
graph remain authoritative.

The current `main.jsx` composes i18next, one Query Client, React Router, and the
browser application. Future slices evolve that composition only for concrete
behavior.

These libraries support the browser-facing responsibility of the one
[booking-system web
application](../DICTIONARY.md#booking-system-web-application). Admin-facing and
Participant-facing experiences remain parts of that application and do not
justify separate workspaces, generic frontend packages, or audience-first
architecture buckets. In particular, these decisions do not create
`apps/admin`, `apps/participant`, `apps/frontend`, `apps/api`,
`packages/frontend`, `packages/ui`, `packages/functional`, `packages/common`,
or `packages/utils`.

Ramda's accepted non-browser scope is defined in [JavaScript
conventions](javascript-conventions.md#use-ramda-selectively). A different
browser dependency may be used outside the browser graph only when a concrete
requirement deliberately introduces that use, its runtime is compatible, and
the applicable boundary map permits it.

## Routing And Navigation

Use `react-router` in Declarative Mode initially. React Router owns:

- URL-to-view mapping;
- browser navigation;
- nested or layout routing where useful; and
- route parameters and location state where appropriate.

Every independently navigable view has a route. Incidental interface state
does not: dialogs, expanded sections, validation messages, toasts, and
transient control state normally remain local UI state unless they become
genuinely independently navigable concepts.

Do not initially make React Router loaders or actions the primary server-state
architecture. `@tanstack/react-query` owns normal remote fetching and
mutations. React Router Data or Framework Mode requires a later demonstrated
need.

Route paths remain stable and language-independent rather than changing with
locale. Direct navigation or refresh to frontend routes must work within the
accepted same-origin Worker and static-assets deployment, while `/api/*`
remains Worker/API-owned. [Runtime and hosting](runtime-and-hosting.md) owns the
deployment and fallback behavior. The current independently navigable route is
`/admin`.

## Server State

`@tanstack/react-query` is the normal browser owner for authoritative remote
application data, including:

- fetching and caching;
- freshness and staleness;
- refetching;
- mutation lifecycle and query invalidation; and
- pending and error state associated with server operations.

Do not mirror ordinary query results into React `useState`, add a second
application request cache, or build generic loading-state infrastructure that
duplicates TanStack Query. The Query Client is not a service locator or
application dependency container.

Queries and mutations live with the [vertical
slice](../DICTIONARY.md#vertical-slice) or use case that conceptually owns them,
not in repository-wide technical-first `queries`, `mutations`, `api`, or
similar buckets. Do not impose global query defaults merely for uniformity.
Use library defaults until a concrete product or application reason grounded
in the semantics of particular data justifies a different policy. When
freshness is material, the owning query should answer: "How stale may this
information safely or usefully be?"

## Forms And Validation

`react-hook-form` owns transient browser form interaction and mechanics where
useful, including field values, dirty or touched state, local field validation,
submit state, and ergonomic form handling. It does not own authoritative
product validity.

Business and domain invariants remain authoritative on the Worker and booking
domain side. Browser validation exists for user experience and may duplicate
simple authoritative validation. Prefer that small duplication to a generic
cross-layer validation abstraction.

Domain and application failures use machine-readable, language-neutral
outcomes. Browser code translates those outcomes into localized messages;
domain packages do not return German or other presentation strings.

## Conditional Class Names

Use `classnames` directly when conditional CSS class construction is needed.
Do not add a local `cn`, `cx`, `classNames`, or equivalent wrapper whose only
responsibility is delegating to the library, and do not create a generic
utility module or shared package for class-name concatenation. A future
wrapper requires a concrete, conceptually distinct responsibility.

## Diagnostic Logging

`debug` is the preferred application-level diagnostic logging mechanism.
Logging is an application and runtime concern, not booking-domain behavior, so
do not add `debug` to `packages/booking` by default. Prefer namespaces that
make conceptual and runtime ownership visible, for example:

```text
booking-system:browser:<slice>
booking-system:worker:<slice>
booking-system:authentication
```

Browser use is accepted. Any Worker use must be verified against the actual
Cloudflare Workers runtime and selected compatibility configuration when it is
introduced; Node compatibility alone is not proof of Workers compatibility.
Do not build a generic logging framework around `debug` before concrete reuse
proves a distinct abstraction.

Diagnostic output must not expose session cookies, security-sensitive session
identifiers, OAuth authorization codes, OAuth/access/refresh tokens,
credentials or secrets, raw Course Invite or Admin Invite token values, or
unnecessary personal data. A broader observability architecture remains
outside this convention.

## Internationalization

Internationalization began with the first frontend slice. Use `i18next` with
`react-i18next`; German is the initial frontend language, while English and
other languages may be added without changing the architecture.

User-visible application copy does not remain scattered as hard-coded strings
through React components. Translation keys are stable semantic identifiers,
not German text used as identifiers. Representative key shapes are:

```text
adminAccess.bootstrap.title
courseStructure.course.name.label
moduleParticipation.selection.save
```

Translation resources follow conceptual and vertical-slice ownership where
practical. Do not anticipate reuse with one giant generic `common` namespace
or a technical shared package. The current Admin-bootstrap resources stay with
that slice and use the `adminAccess` semantic key family.

## Local Ownership And Late Abstraction

Routing, query, form, translation, presentation, and adapter behavior stays
close to the use case that owns it when those parts change together. The use
of these libraries does not justify generic `services`, `api`, `queries`,
`mutations`, `utils`, `common`, `core`, `functional`, or `combinators`
modules or packages. Follow [JavaScript conventions](javascript-conventions.md)
for functional composition and [architecture principles](principles.md) for
late extraction.
