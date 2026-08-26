# Packages

Packages are conceptual domain boundaries, not deployment units or collections
of technical reuse.

## Current Inventory

The template defines no package. A future project adds a package only when a
stable product concept has one clear owner and independent change pressure.

## Definition Rule

Document every conceptual package here when it is introduced. Give it a name
from product language and define its `Responsibility`, `Not responsible for`,
`Inputs`, `Outputs`, and adjacent parts.

Reuse, file count, provider use, or convenience is not sufficient evidence for
a package. Do not create default `shared`, `core`, `utils`, provider, database,
transport, or all-contracts packages.
