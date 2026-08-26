# Docs Status

The indexed docs system is active for the process and architecture areas. Each
area has a human-oriented overview, routing index, current status, rationale,
and focused topic docs.

The repository is intentionally a product-neutral template:

- no product, domain, technology, or research area is defined;
- no application or package workspace is declared;
- no product source code or runtime dependency exists;
- no workspace boundary map is registered yet;
- no project-specific Markplane item or note exists; and
- no co-located `*.docs.md` file exists.

The architecture rule implementation and its tests are live. Source-shape rules
already target future `apps/*/src/` and `packages/*/src/` trees. A future
workspace activates deny-by-default dependency enforcement by declaring its
local boundary map and registering it explicitly in `eslint.config.mjs`.

Project-specific docs should be added only when accepted project truth gives
them a concrete responsibility.
