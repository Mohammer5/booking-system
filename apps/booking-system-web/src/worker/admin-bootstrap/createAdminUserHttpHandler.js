import {
  createDeleteAdminUser,
  createDisableAdminUser,
  createListAdminUsers,
  createPromoteAdminUser,
  createReenableAdminUser,
  createResolveAdminContext,
  createUpdateAdminUserName,
  deriveAdminUserLifecycleActions,
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
    deleteAdminUser: createDeleteAdminUser({
      deleteAuthorizedAdminUser:
        capabilities.adminPersistence.deleteAuthorizedAdminUser,
    }),
    disableAdminUser: createDisableAdminUser({
      disableAuthorizedAdminUser:
        capabilities.adminPersistence.disableAuthorizedAdminUser,
    }),
    listAdminUsers: createListAdminUsers({
      listCurrentAdminUsers:
        capabilities.adminPersistence.listCurrentAdminUsers,
    }),
    promoteAdminUser: createPromoteAdminUser({
      promoteAuthorizedAdminUser:
        capabilities.adminPersistence.promoteAuthorizedAdminUser,
    }),
    reenableAdminUser: createReenableAdminUser({
      reenableAuthorizedAdminUser:
        capabilities.adminPersistence.reenableAuthorizedAdminUser,
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
    new Set(["GET", "PUT", "DELETE"]).has(request.method)
  ) {
    return {
      kind: request.method === "DELETE" ? "deletion" : "detail",
      adminUserId: segments[0],
    };
  }

  if (
    segments.length !== 2 ||
    segments[0].length === 0 ||
    request.method !== "POST"
  ) {
    return null;
  }

  const commandKinds = {
    disablement: "disablement",
    promotion: "promotion",
    reenablement: "reenablement",
  };
  const kind = commandKinds[segments[1]];

  return kind === undefined ? null : { kind, adminUserId: segments[0] };
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

  if (new Set(["disablement", "reenablement", "deletion"])
    .has(context.route.kind)) {
    return handleLifecycle(context, targetAdminUser, operations);
  }

  return context.request.method === "GET"
    ? jsonResponse(toAdminUserResponse(targetAdminUser, context.adminUser), 200)
    : handleNameUpdate(context, targetAdminUser, operations);
}

/** @returns {Promise<Response>} Apply one guarded lifecycle command. */
async function handleLifecycle(context, targetAdminUser, operations) {
  const operation = {
    disablement: operations.disableAdminUser,
    reenablement: operations.reenableAdminUser,
    deletion: operations.deleteAdminUser,
  }[context.route.kind];
  const result = await operation({
    adminUser: context.adminUser,
    targetAdminUser,
  });

  if (result.outcome === "deleted") {
    return jsonResponse({ adminUserId: result.adminUserId }, 200);
  }

  return new Set(["disabled", "re-enabled"]).has(result.outcome)
    ? jsonResponse(
        toAdminUserResponse(result.adminUser, context.adminUser),
        200,
      )
    : refusalResponse(result);
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
    "admin-user-last-active-super": 409,
    "admin-user-not-active": 409,
    "admin-user-not-deleted": 409,
    "admin-user-not-disabled": 409,
    "admin-user-not-manageable": 409,
    "admin-user-not-re-enabled": 409,
    "admin-user-not-found": 404,
    "admin-user-not-promotable": 409,
    "admin-user-not-promoted": 409,
    "admin-user-not-updated": 409,
    "admin-user-self-protected": 409,
    "invalid-name": 422,
  };

  return jsonResponse({ outcome: result.outcome }, statuses[result.outcome] ?? 409);
}

/** @returns {object} Narrow Admin User representation and edit affordance. */
function toAdminUserResponse(targetAdminUser, adminUser) {
  const lifecycle = deriveAdminUserLifecycleActions({
    adminUser,
    targetAdminUser,
  });

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
    isDisableAvailable: lifecycle.canDisable,
    isReenableAvailable: lifecycle.canReenable,
    isDeleteAvailable: lifecycle.canDelete,
    lifecycleRestriction: lifecycle.restriction,
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
