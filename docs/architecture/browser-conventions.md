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
- `@mui/material` with its supported open-source styling dependencies;
- `react-router`;
- `@tanstack/react-query`;
- `classnames`;
- `react-hook-form`;
- `debug`;
- `ramda`;
- `i18next`; and
- `react-i18next`.

The current browser uses React, React DOM, React Router, TanStack Query, React
Hook Form, i18next, react-i18next, the application-owned Better Auth React
client, and MUI Core with Emotion styling. It does not declare
`classnames`, `debug`, or `ramda` because no current source needs them.
Acceptance here grants neither an import edge nor inclusion in every
application output: the application [boundary
map](../DICTIONARY.md#boundary-map) and each runtime source/build graph remain
authoritative.

The current `main.jsx` composes the repository-owned MUI `ThemeProvider` and
`CssBaseline`, i18next, one Query Client, React Router, and the browser
application. Future slices evolve that composition only for concrete behavior.

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

## Material UI And Accessible Interaction

Material UI (MUI) is the accepted component library and visual foundation for
the complete browser experience. The application manifest pins
`@mui/material` 9.4.0, `@emotion/react` 11.14.0, and `@emotion/styled` 11.14.1.
MUI's declared peer range covers the repository's React 19.2.8, and the locked
Vite 8.2.2 production build verifies the current composition. See the official
[MUI versions](https://mui.com/material-ui/getting-started/versions/),
[installation and peer-dependency](https://mui.com/material-ui/getting-started/installation/),
and [v9 migration](https://mui.com/material-ui/migration/upgrade-to-v9/)
guidance.

`src/browser/applicationTheme.js` owns the single theme: system typography,
eight-pixel spacing, explicit responsive breakpoints, application surfaces,
and a high-contrast three-pixel visible-focus outline. `main.jsx` applies that
theme and `CssBaseline` once. The Admin authentication/bootstrap,
current-context, refusal, failure, and sign-out states plus the Participant
directory, Course membership/Assignment Dialog, Course index/create/detail,
Course editing and permanent timezone-lock presentation, Course-wide Group
creation/editing/lifecycle, and Module creation/descriptive-edit/schedule-edit
plus cancellation/deletion states use free MUI Core components directly
without changing their HTTP,
authentication, or domain ownership. Native `datetime-local` fields collect
local minutes; MUI radio groups expose server-resolved DST-overlap occurrences,
so no MUI X or date/time dependency is present. The Participant and Admin
routes share one responsive browser-owned shell with a banner, named list
navigation, narrow modal Drawer, skip link, and one main landmark; route
content remains slice-owned.

The local Playwright harness uses `@axe-core/playwright` 4.13.0 for automated
scans of critical Admin/Course states and both application contexts at desktop
and 360px widths. Explicit assertions separately cover landmarks and headings,
accessible names, keyboard activation, visible focus, field/error association,
Drawer/Dialog trapping and restoration, result/error focus, direct navigation
and refresh, pre-authorization Course privacy, Participant
authentication/onboarding/home/sign-out, zero membership without public
discovery, global Participant directory and Course membership states, direct
Assignment/repeat/Disabled-target interaction, Participant self/Admin profile
editing, duplicate/stale refusal and stable Disabled-target detail, Group/Module
empty and creation states, Group edit/archive/reactivate/delete and retained-history
states, Module lifetime descriptive editing and future-only rescheduling,
terminal cancellation and retained-history presentation,
reference-protected permanent deletion and zero-current-Module timezone lock,
Course editing and permanent timezone lock even
with zero current Modules, definite-instant display, DST gap/overlap
interaction, stale/technical refusals, and horizontal overflow.

MUI X Community may be introduced only for a concrete need such as date/time
input; its Community packages are MIT-licensed, while Pro and Premium packages
are excluded. See the official [MUI X licensing
contract](https://mui.com/x/introduction/licensing/).

Every browser-facing slice must provide German-first localized copy and
appropriate loading, empty, success, validation, error, unavailable, and
destructive-confirmation states. Applicable WCAG 2.2 AA behavior includes
semantic labels and accessible names, full keyboard operation, predictable
focus movement and restoration, visible focus, and status communication that
does not rely on color alone. Automated accessibility scans supplement rather
than replace explicit keyboard, focus, dialog-focus, and accessible-name
assertions for critical journeys. Desktop and narrow/mobile viewports are both
acceptance surfaces.

Do not build a parallel bespoke design system or a generic local wrapper for
each MUI component. A shared presentation abstraction is justified only after
repeated concrete use demonstrates that it represents one stable concept with
one owner. MUI and its styling dependencies remain private to browser-facing
source. The application boundary map permits only the exact MUI entrypoints
used by the browser responsibility and `main.jsx`; Worker, authentication,
persistence, and booking-domain source have no such permission.

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
deployment and fallback behavior. The current independently navigable routes
are the Participant entry at `/`, Participant profile at `/profile`,
public Course Invite continuation and Join at `/invite`,
administration entry at `/admin`, public Admin Invite onboarding at
`/admin/invite`, Admin Invite administration at `/admin/invites`, current
Admin User directory at `/admin/users`, stable Admin User detail/name editing
at `/admin/users/:adminUserId`, global
Participant directory at
`/admin/participants`, stable Participant detail/edit at
`/admin/participants/:participantId`, Course index at
`/admin/courses`, creation at `/admin/courses/new`, and stable detail at
`/admin/courses/:courseId`. Assigned Participant Course detail is independently
navigable at `/courses/:courseId` beneath the Participant gate. Course
membership and its owned actions remain on stable Admin Course detail because
they are not independently navigable views; assigned Participant Module and
Group structure remains on stable Participant Course detail. Admin Invite
creation and revocation Dialogs remain incidental state on `/admin/invites`;
the complete URL exists only in the successful creation Dialog's transient
mutation result and is discarded on close or refresh rather than entering the
query cache.
The public Admin Invite route keeps its raw fragment only in slice-owned
session storage until initial recognition, removes it from the address bar,
and then uses only the signed server continuation. Authentication, refresh,
local name validation, and abandonment consume nothing; current Active or
Disabled Admin principals receive a common refusal, while a principal with no
current Admin receives the explicit-name form and one focused terminal result.

The Admin User directory consumes server-derived `isNameEditable` and
`isPromotionAvailable` rather than reimplementing the self/ordinary/Super
matrices in browser code. Desktop uses a semantic table and narrow viewports
use a named card list without horizontal overflow. Stable detail always shows
explicit authority and state, mounts the name-only React Hook Form only when
permitted, explains provider-data independence, and focuses validation,
success, or stale refusal. Successful self-edit invalidates current-Admin
state as well as directory/detail data. Eligible directory and detail targets
share one incidental MUI promotion Dialog that identifies the target, explains
the permanent one-way change, initially focuses Cancel, restores its opener on
cancellation, focuses a stale refusal in-place, and focuses the reconciled
success after close. No demotion control exists.

## Browser Authentication

The Admin slice imports `createAuthClient` from the exact
`better-auth/react` entry and uses only the normal same-origin Better Auth
session. Google sign-in fixes its post-authentication application destination
to `/admin` and its error destination to an application-owned same-origin
sanitizer; browser callers cannot supply an external destination. Better Auth
continues to own the one provider callback at `/api/auth/callback/google`.

The same slice uses Better Auth sign-out for Active Admins, principals without
an Admin User, and Disabled Admins. Successful sign-out invalidates or resets
the existing TanStack Admin queries so `/admin` returns to the current public
unauthenticated entry. The browser does not create another session concept or
read provider tokens, profile data, session tokens, or cookies.

The Participant slice uses a separate browser-owned Better Auth client only to
start and terminate that same normal session. Its Google success destination
is fixed to `/`, and its sanitized application failure destination is fixed to
`/api/auth/participant-error`; callers cannot provide either destination. The
current Participant is always queried from `/api/participant/me`, so navigating
between Participant and Admin contexts never stores a selected role.

Authentication initiation and callback failures are language-neutral
application state mapped to localized copy. Raw provider error descriptions
are discarded before returning to browser UI and security-sensitive OAuth or
session material is never rendered.

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

The Participant registration slice is the current example: TanStack Query owns
fresh `/api/participant/me` state and invalidation, React Hook Form owns the
explicit booking-system name/email controls, and Worker/domain outcomes drive
localized validation, conflict, loading, disabled, technical, success, and
zero-membership states. Separate Participant Course queries mount only beneath
the Active Participant gate: the list owns pending/error/empty/populated home
states, while the stable detail query owns unavailable/technical/detail states.
Neither query is a public catalogue, and the browser presents the current
Participant's own Module Selection or truthful absence. Each eligible Module
uses an explicit no-default radio choice plus set/change/remove mutations;
removal requires a keyboard-accessible confirmation Dialog with focus
restoration. Server-derived availability and mutation outcomes own deadline and
current-state truth rather than the browser wall clock.

The same Participant list/detail routes admit privately assigned Active and
Archived Courses. Archived state is named in list and detail, all retained
own Selections are presented as historical, and no set/change/remove control
is rendered. Revocation invalidates these caches so the Course disappears and
its stable direct route returns the privacy-preserving unavailable state.

Course editing uses the same ownership split on stable Admin Course detail.
TanStack Query owns the authoritative Course and mutation lifecycle, React Hook
Form owns the complete name/description/timezone controls, and Worker/domain
outcomes own field validity, current actor/Course state, and the permanent
first-Module timezone lock. The timezone is editable only when the derived
Course representation permits it; otherwise the browser presents accurate
permanent-lock copy while continuing to permit descriptive edits. A conflict
refreshes the detail so stale forms cannot keep presenting old editability.

Module management follows the same stable-detail ownership without adding a
Module route. Every retained Module card has one descriptive form that remains
available for Scheduled or Cancelled Modules and one distinct schedule area.
The schedule form appears only for the server-derived pre-start Scheduled
capability; exact-start, elapsed, and Cancelled Modules instead receive
explicit non-color-only lock copy. Course-local `datetime-local` fields and
per-Module radio-group identities reuse server-resolved DST candidates.
Successful mutations reconcile both Admin and Participant Course detail, while
a schedule conflict refreshes authoritative editability and current instants.

The same Module card exposes a distinct destructive cancellation action only
for the server-derived before-`endsAt` Scheduled capability. Its MUI Dialog
names the Module, explains terminal state and retained Selection history,
focuses cancellation first, restores the invoking action on dismissal, and
keeps deadline/stale/technical errors focused in the Dialog. Success focuses a
parent-owned status after the card refreshes. Cancelled Modules retain the
descriptive form, show non-color-only terminal copy, lock schedule controls,
and cause Participant Selection controls to disappear while the retained
selected Group remains visible as historical.

Permanent Module deletion is a separate destructive card action available for
Scheduled or Cancelled Modules at every time position. Its MUI Dialog names
the Module and permanence, focuses cancellation first, restores the invoking
action on dismissal, and focuses privacy-safe retained-reference, stale, or
technical failures. TanStack Query reconciles Admin and Participant detail;
after success the card unmounts and a parent-owned Module-section status takes
focus. Last-row deletion presents the truthful empty state while the Course
timezone remains visibly and authoritatively locked.

Terminal Course archival is a body-free mutation on stable Admin Course
detail. Its German MUI Dialog names permanence and read-only consequences,
focuses cancellation first, disables confirmation for a known unfinished
Scheduled Module, restores the invoking action on dismissal, and focuses
stale/technical feedback or parent-owned success. The server remains
authoritative if eligibility changes. Archived detail retains Course, Group,
Module, membership, and Selection-history inspection while removing Course/
Group/Module forms and lifecycle actions plus Assignment add/reactivation;
only Active-Assignment revocation remains actionable. Admin and Participant
Course list/detail caches are reconciled after success.

Course Assignment lifecycle uses the same ownership split. TanStack Query
owns membership-list and assigned-Course invalidation after reactivation or
revocation, while a keyboard-accessible confirmation Dialog owns only the
transient decision and restores focus on cancellation. Membership cards expose
revocation for Active Assignments in Active or Archived Courses and
reactivation only for Revoked Assignments in Active Courses. Localized copy
states that revocation removes only future Scheduled Selections and that
reactivation does not restore them; server outcomes remain authoritative for
stale, repeated, and technical results.

Group lifecycle and deletion remain on stable Admin Course detail. TanStack Query
invalidates the Admin and Participant Course detail caches after a complete
field edit, archival, reactivation, or deletion. React Hook Form owns one complete
name/details form per retained Active or Archived Group; an authoritative
Active-name conflict is associated with its name field. The current lifecycle
action opens a keyboard-accessible MUI Dialog, focuses cancellation initially,
restores the invoking action on cancel, and returns a reactivation name
conflict to the field. German copy explains that archival changes future
eligibility but neither removes nor rewrites a Selection. Participant Course
detail lists only Active Groups as new choices while presenting the retained
selected Group's identity, details, and state in current/history summary.
Permanent deletion uses a separate destructive Dialog naming the Group and
permanence. It focuses cancellation first, restores the invoking action on
cancel, keeps privacy-safe retained-reference failures in the Dialog, and
announces success from the parent Group section after the deleted card unmounts.

Participant profile maintenance reuses this ownership split: TanStack Query
owns current self/detail profile state and targeted invalidation, React Hook
Form owns the name/email controls, and the Worker/domain remains authoritative
for active actor/target state, complete-email uniqueness, and stale refusal.
The shared form presents the server's current values without reading provider
profile data, moves focus to field or result/error feedback, and uses stable
direct routes for self service and Admin maintenance of Active or Disabled
Participants.

Participant lifecycle stays on the same stable Admin detail. One current
Disable or Re-enable action opens a keyboard-accessible confirmation Dialog;
Disable copy explains global access loss and exact future-Selection removal,
while Re-enable promises only currently eligible access and no restoration.
TanStack Query invalidates Participant detail/directory, Course membership,
current Participant, and assigned-Course caches after success. The existing
Participant route gate presents the fresh Disabled state as a focusable
unavailable alert with safe Better Auth sign-out instead of mounting normal
Participant, profile, Course, or Selection views.

Shared Course Invite management stays on stable Active Admin Course detail.
TanStack Query owns the current Invite and lifecycle mutations; the browser
shows one enabled/disabled URL, semantic copy feedback, direct re-enablement,
and destructive disable/replacement Dialogs with safe initial focus,
restoration, and focused results. Archived Course detail mounts no Invite
management. The independently navigable `/invite` route lives outside Admin
and Participant gates: it captures raw authority from the URL fragment into an
Invite-specific `sessionStorage` key, immediately cleans the address bar with
`replaceState`, and submits only a no-store recognition body. Successful
recognition erases the raw browser value and later refresh/authentication/
onboarding return reads an `HttpOnly` signed continuation. The German MUI
surface renders only Course name and non-color-only Invite meaning before
Join, reuses fixed Google entry and explicit Participant onboarding, then
offers an explicit keyboard-accessible Join Dialog only to an Active
Participant. Focused success, repeat, Revoked, stale, Disabled, and technical
states never mount private Course data; successful Join exposes only a link to
the normal assigned-Course route.

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
courseAccess.assignmentDialog.submit
courseStructure.course.name.label
moduleParticipation.selection.save
```

Translation resources follow conceptual and vertical-slice ownership where
practical. Do not anticipate reuse with one giant generic `common` namespace
or a technical shared package. The browser composition combines resources
owned by the application shell, Participant entry, Admin-bootstrap, Course
access, and Course structure slices; those resources retain the `adminAccess`,
`courseAccess`, and `courseStructure` semantic key families.

## Local Ownership And Late Abstraction

Routing, query, form, translation, presentation, and adapter behavior stays
close to the use case that owns it when those parts change together. The use
of these libraries does not justify generic `services`, `api`, `queries`,
`mutations`, `utils`, `common`, `core`, `functional`, or `combinators`
modules or packages. Follow [JavaScript conventions](javascript-conventions.md)
for functional composition and [architecture principles](principles.md) for
late extraction.
