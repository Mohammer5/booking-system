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

## Keep The Template Product-Neutral

The reusable repository owns only its documentation process, architecture
philosophy and enforcement, and Markplane development workflow. Product,
domain, technology, research, workspace, and backlog content belongs to the
project created from the template and is not represented by examples that
could be mistaken for accepted truth.

## Separate Conceptual Truth From Technology Choices

Future product and domain docs should use product language. Concrete providers
and runtime mechanisms should live behind architecture boundaries and in a
separate technology area when the project has actually selected them.
