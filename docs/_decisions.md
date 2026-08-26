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
repository truth. The booking-system specification now meets that threshold;
technology, research, workspace, and backlog content remain absent until
similarly justified.

## Separate Conceptual Truth From Technology Choices

Future product and domain docs should use product language. Concrete providers
and runtime mechanisms should live behind architecture boundaries and in a
separate technology area when the project has actually selected them.
