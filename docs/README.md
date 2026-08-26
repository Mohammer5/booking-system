# Documentation

This tree contains the booking system's accepted product truth together with
the reusable documentation process and architecture foundation. Product rules
remain separate from implementation and technology choices.

Start with:

- [Product](product/README.md) for the booking-system domain, behavior,
  lifecycle, permissions, and explicit non-goals.
- [Process](process/README.md) for documentation and tracking workflow,
  verification, and releases.
- [Architecture](architecture/README.md) for architecture philosophy, source
  organization, accepted runtime and persistence direction, and ESLint
  enforcement.

Use `_index.md` files for agent routing. Use `README.md` files for human mental
models, `_status.md` for present reality, `_decisions.md` for rationale, and
focused topic docs for canonical facts. Accepted technical direction belongs
in architecture and process docs while the product specification remains
implementation-agnostic.
