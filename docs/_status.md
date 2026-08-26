# Docs Status

The indexed docs system is active for the product, process, and architecture
areas. Each area has a human-oriented overview, routing index, current status,
rationale, and focused topic docs.

The indexed product area now defines the accepted, implementation-agnostic
booking-system domain and behavior. It has a human-oriented overview, routing
index, current status, rationale, focused responsibility docs, explicit
non-goals, and representative scenarios.

The repository remains intentionally implementation-neutral:

- no product source code or runtime dependency exists;
- no application or package workspace is declared;
- no technology, database, API, frontend, or infrastructure design is
  selected;
- no workspace boundary map is registered yet;
- no project-specific Markplane item or note exists; and
- no co-located `*.docs.md` file exists.

The architecture rule implementation and its tests are live. Source-shape rules
already target future `apps/*/src/` and `packages/*/src/` trees. A future
workspace activates deny-by-default dependency enforcement by declaring its
local boundary map and registering it explicitly in `eslint.config.mjs`.

Further project-specific docs should be added only when accepted project truth
gives them a concrete responsibility.
