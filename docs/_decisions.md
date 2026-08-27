# Docs Decisions

## `_index.md` Owns Routing

The repository uses `_index.md` instead of `README.md` for docs navigation so
routing metadata stays separate from human-oriented explanation.

## `README.md` Owns The Mental Model

Each docs folder uses `README.md` as its human entrypoint. This makes the file
name familiar and predictable without overloading it with routing duties.

## `_status.md` And `_decisions.md` Are Special-Purpose Docs

Current-state information and rationale change at different rates and for
different reasons. Keeping them out of `README.md` reduces drift and makes it
clearer where to update repository truth.

## Add Product Truth Only From Accepted Requirements

The repository began as a product-neutral template. Product or domain content
is added only when concrete accepted requirements give it an owner and make it
repository truth. The booking-system specification and accepted hosting,
persistence, verification, and release direction met that threshold. The
repository therefore kept workspaces and runtime implementation absent until
authorized implementation changes justified them.

## Separate Conceptual Truth From Technology Choices

Product and domain docs use product language. Selected providers, runtime
mechanisms, testing tools, and delivery policy live in the architecture and
process areas, behind product-facing application boundaries. This keeps the
product specification implementation-agnostic even after technology decisions
have been accepted.
