import {
  createListAdminUsers,
  createPromoteAdminUser,
  createResolveAdminContext,
  createUpdateAdminUserName,
  isAdminUserNameEditable,
  isAdminUserPromotable,
} from "@booking-system/booking";

const collectionPath = "/api/admin/users";

/**
 * Create authenticated current Admin User directory and name-edit handling.
 *
 * @param {object} capabilities Authentication and Admin persistence capabilities.
 * @returns {(request: Request) => Promise<Response>} Admin User HTTP handler.
 */
export function createAdminUserHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleAdminUserHttpRequest(request) {
    try {
      const route = matchRoute(request);

      if (route === null) return jsonResponse({ outcome: "not-found" }, 404);
      const authorization = await authorize(request, operations);

      if (authorization.response !== undefined) return authorization.response;
      return await handleAuthorizedRequest(
        { request, route, adminUser: authorization.adminUser },
        operations,
      );
    } catch {
      return jsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {object} Domain operations composed from application capabilities. */
function createOperations(capabilities) {
  return {
    ...capabilities,
    listAdminUsers: createListAdminUsers({
      listCurrentAdminUsers:
        capabilities.adminPersistence.listCurrentAdminUsers,
    }),
    promoteAdminUser: createPromoteAdminUser({
      promoteAuthorizedAdminUser:
        capabilities.adminPersistence.promoteAuthorizedAdminUser,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
    updateAdminUserName: createUpdateAdminUserName({
      updateAuthorizedAdminUserName:
        capabilities.adminPersistence.updateAuthorizedAdminUserName,
    }),
  };
}

/** @returns {object | null} Exact collection or Admin User item route. */
function matchRoute(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === collectionPath) {
    return request.method === "GET" ? { kind: "list" } : null;
  }

  if (!pathname.startsWith(`${collectionPath}/`)) return null;
  const segments = pathname.slice(collectionPath.length + 1).split("/");

  if (
    segments.length === 1 &&
    segments[0].length > 0 &&
    new Set(["GET", "PUT"]).has(request.method)
  ) {
    return { kind: "detail", adminUserId: segments[0] };
  }

  return segments.length === 2 &&
    segments[0].length > 0 &&
    segments[1] === "promotion" &&
    request.method === "POST"
    ? { kind: "promotion", adminUserId: segments[0] }
    : null;
}

/** @returns {Promise<object>} Fresh Active Admin or exact response. */
async function authorize(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return { response: jsonResponse({ outcome: "unauthenticated" }, 401) };
  }

  const context = await operations.resolveAdminContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-admin"
    ? { adminUser: context.adminUser }
    : { response: jsonResponse(context, 403) };
}

/** @returns {Promise<Response>} One freshly authorized Admin User operation. */
async function handleAuthorizedRequest(context, operations) {
  if (context.route.kind === "list") {
    const result = await operations.listAdminUsers({
      adminUser: context.adminUser,
    });

    return result.outcome === "listed"
      ? jsonResponse({
          adminUsers: result.adminUsers.map((adminUser) =>
            toAdminUserResponse(adminUser, context.adminUser)),
        }, 200)
      : refusalResponse(result);
  }

  const targetAdminUser = await operations.adminPersistence.findAdminUserById(
    context.route.adminUserId,
  );

  if (targetAdminUser === null) {
    return jsonResponse({ outcome: "admin-user-not-found" }, 404);
  }

  if (context.route.kind === "promotion") {
    return handlePromotion(context, targetAdminUser, operations);
  }

  return context.request.method === "GET"
    ? jsonResponse(toAdminUserResponse(targetAdminUser, context.adminUser), 200)
    : handleNameUpdate(context, targetAdminUser, operations);
}

/** @returns {Promise<Response>} Apply one guarded one-way promotion. */
async function handlePromotion(context, targetAdminUser, operations) {
  const result = await operations.promoteAdminUser({
    adminUser: context.adminUser,
    targetAdminUser,
  });

  return result.outcome === "promoted"
    ? jsonResponse(
        toAdminUserResponse(result.adminUser, context.adminUser),
        200,
      )
    : refusalResponse(result);
}

/** @returns {Promise<Response>} Validate and apply one guarded name update. */
async function handleNameUpdate(context, targetAdminUser, operations) {
  const body = await readJsonObject(context.request);
  const result = await operations.updateAdminUserName({
    adminUser: context.adminUser,
    targetAdminUser,
    name: body.name,
  });

  if (result.outcome === "updated") {
    return jsonResponse(
      toAdminUserResponse(result.adminUser, context.adminUser),
      200,
    );
  }

  return refusalResponse(result);
}

/** @returns {Response} Exact validation, actor, or target refusal. */
function refusalResponse(result) {
  const statuses = {
    "admin-not-active": 403,
    "admin-user-not-editable": 409,
    "admin-user-not-found": 404,
    "admin-user-not-promotable": 409,
    "admin-user-not-promoted": 409,
    "admin-user-not-updated": 409,
    "invalid-name": 422,
  };

  return jsonResponse({ outcome: result.outcome }, statuses[result.outcome] ?? 409);
}

/** @returns {object} Narrow Admin User representation and edit affordance. */
function toAdminUserResponse(targetAdminUser, adminUser) {
  return {
    id: targetAdminUser.id,
    name: targetAdminUser.name,
    state: targetAdminUser.state,
    authority: targetAdminUser.authority,
    isNameEditable: isAdminUserNameEditable({ adminUser, targetAdminUser }),
    isPromotionAvailable: isAdminUserPromotable({
      adminUser,
      targetAdminUser,
    }),
  };
}

/** @returns {Promise<object>} Parsed JSON object or empty invalid input. */
async function readJsonObject(request) {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/** @returns {Response} Non-cacheable narrow JSON. */
function jsonResponse(body, status) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
