# Applications

[Applications](../DICTIONARY.md#application) are independently runnable or
served deployment shells. Their names describe product-facing or execution
roles, while their internal technical mechanisms remain private.

## Current Inventory

No application workspace or runtime implementation exists.

## Accepted Initial Boundary

The first application will be one booking-system web application rather than
separate frontend and API deployments. Its eventual workspace name must express
that conceptual product-facing role, not a provider or mechanism such as
Cloudflare, Worker, Vite, or D1.

- **Responsibility:** Serve the browser booking experience and its same-origin
  API as one deployable boundary.
- **Not responsible for:** Owning product rules or turning runtime and storage
  providers into product concepts.
- **Inputs:** Browser navigation, static-asset requests, API requests, and
  conceptual capabilities supplied at composition.
- **Outputs:** Frontend assets and API responses.
- **Adjacent parts:** Future conceptual packages, private Worker/Vite
  composition, and D1 persistence.

See [runtime and hosting](runtime-and-hosting.md) for the accepted deployment
shape. This target description does not declare a workspace or claim that the
application is already runnable.

## Definition Rule

Document every application here when it is introduced. Give it a conceptual
name and define its `Responsibility`, `Not responsible for`, `Inputs`,
`Outputs`, and runtime surface. Keep provider names and framework mechanics out
of the application identity.

An application may compose domain behavior with technical capabilities at its
root. It may not turn that composition root into a product-policy owner, global
service locator, or generic integration package.
