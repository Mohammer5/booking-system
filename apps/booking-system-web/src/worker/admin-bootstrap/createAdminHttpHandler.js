import {
  createBootstrapFirstAdmin,
  createGetAdminAuthenticationEntry,
  createResolveAdminContext,
} from "@booking-system/booking";

/**
 * Create the three same-origin first-Admin HTTP operations.
 *
 * @param {object} capabilities Application and booking capabilities.
 * @returns {(request: Request) => Promise<Response>} The Admin HTTP handler.
 */
export function createAdminHttpHandler({
  authenticate,
  createAdminUserId,
  persistence,
}) {
  const getAdminAuthenticationEntry = createGetAdminAuthenticationEntry({
    hasAdminUserEverBeenCreated: persistence.hasAdminUserEverBeenCreated,
  });
  const bootstrapFirstAdmin = createBootstrapFirstAdmin({
    createAdminUserId,
    claimFirstAdmin: persistence.claimFirstAdmin,
  });
  const resolveAdminContext = createResolveAdminContext({
    findAdminUserByExternalPrincipalId:
      persistence.findAdminUserByExternalPrincipalId,
  });

  return async function handleAdminHttpRequest(request) {
    const route = `${request.method} ${new URL(request.url).pathname}`;

    if (route === "GET /api/admin/entry") {
      return jsonResponse(await getAdminAuthenticationEntry(), 200);
    }

    if (route === "POST /api/admin/bootstrap") {
      return handleBootstrapRequest(request, {
        authenticate,
        bootstrapFirstAdmin,
      });
    }

    if (route === "GET /api/admin/me") {
      return handleCurrentAdminRequest(request, {
        authenticate,
        resolveAdminContext,
      });
    }

    return jsonResponse({ outcome: "not-found" }, 404);
  };
}

/**
 * Translate an authenticated first-Admin request to its HTTP contract.
 *
 * @param {Request} request The bootstrap request.
 * @param {object} operations Authentication and booking operations.
 * @returns {Promise<Response>} The bootstrap response.
 */
async function handleBootstrapRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return jsonResponse({ outcome: "unauthenticated" }, 401);
  }

  const body = await readJsonObject(request);
  const result = await operations.bootstrapFirstAdmin({
    externalPrincipalId: authentication.externalPrincipalId,
    name: body.name,
  });

  if (result.outcome === "invalid-name") {
    return jsonResponse(result, 422);
  }

  if (result.outcome === "bootstrap-unavailable") {
    return jsonResponse(result, 409);
  }

  return jsonResponse(toCurrentAdmin(result.adminUser), 201);
}

/**
 * Translate fresh current-Admin resolution to its HTTP contract.
 *
 * @param {Request} request The current-Admin request.
 * @param {object} operations Authentication and booking operations.
 * @returns {Promise<Response>} The current-Admin response.
 */
async function handleCurrentAdminRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return jsonResponse({ outcome: "unauthenticated" }, 401);
  }

  const context = await operations.resolveAdminContext(
    authentication.externalPrincipalId,
  );

  if (context.outcome === "no-admin-user") {
    return jsonResponse(context, 403);
  }

  if (context.outcome === "disabled-admin") {
    return jsonResponse(context, 403);
  }

  return jsonResponse(toCurrentAdmin(context.adminUser), 200);
}

/**
 * Read a narrow JSON object, treating malformed input as invalid fields.
 *
 * @param {Request} request The incoming request.
 * @returns {Promise<object>} Parsed input or an empty object.
 */
async function readJsonObject(request) {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/**
 * Remove application-private principal data from an Admin representation.
 *
 * @param {object} adminUser The booking-domain Admin User.
 * @returns {object} The narrow browser representation.
 */
function toCurrentAdmin(adminUser) {
  return {
    id: adminUser.id,
    name: adminUser.name,
    state: adminUser.state,
    authority: adminUser.authority,
  };
}

/**
 * Create one JSON response without a universal envelope.
 *
 * @param {object} body The response body.
 * @param {number} status The HTTP status.
 * @returns {Response} The JSON response.
 */
function jsonResponse(body, status) {
  return Response.json(body, { status });
}
