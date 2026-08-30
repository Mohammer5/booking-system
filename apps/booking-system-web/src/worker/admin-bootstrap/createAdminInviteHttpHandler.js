import {
  createAdminInvite,
  createResolveAdminContext,
  createRevokeAdminInvite,
} from "@booking-system/booking";
import {
  adminCollectionConfigurations,
  parseAdminCollectionQuery,
} from "../admin-collections/index.js";

const collectionPath = "/api/admin/invites";

/**
 * Create authenticated Admin Invite administration HTTP handling.
 *
 * @param {object} capabilities Authentication, identity, secret, and persistence capabilities.
 * @returns {(request: Request) => Promise<Response>} Admin Invite HTTP handler.
 */
export function createAdminInviteHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleAdminInviteHttpRequest(request) {
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
    createInvite: createAdminInvite({
      createAdminInviteId: capabilities.createAdminInviteId,
      createAdminInviteToken: capabilities.createAdminInviteToken,
      hashAdminInviteToken: capabilities.hashAdminInviteToken,
      now: capabilities.adminInviteNow,
      createActiveAdminInvite:
        capabilities.invitePersistence.createActiveAdminInvite,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
    revokeInvite: createRevokeAdminInvite({
      revokeActiveAdminInvite:
        capabilities.invitePersistence.revokeActiveAdminInvite,
    }),
  };
}

/** @returns {object | null} Exact collection or Revoke route. */
function matchRoute(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === collectionPath) {
    return new Set(["GET", "POST"]).has(request.method)
      ? { kind: request.method === "GET" ? "list" : "create" }
      : null;
  }

  const segments = pathname.split("/");

  return request.method === "POST" &&
    segments.length === 6 &&
    segments[1] === "api" &&
    segments[2] === "admin" &&
    segments[3] === "invites" &&
    segments[4].length > 0 &&
    segments[5] === "revocation"
    ? { kind: "revoke", inviteId: segments[4] }
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

/** @returns {Promise<Response>} One freshly authorized Admin Invite operation. */
async function handleAuthorizedRequest(context, operations) {
  if (context.route.kind === "create") {
    const result = await operations.createInvite({ adminUser: context.adminUser });

    return result.outcome === "created"
      ? jsonResponse({
          outcome: result.outcome,
          invite: toCreatedInvite(context.request, result.invite),
        }, 201)
      : refusalResponse(result);
  }

  if (context.route.kind === "list") {
    const parsed = parseAdminCollectionQuery(
      new URL(context.request.url).searchParams,
      adminCollectionConfigurations.invites,
    );

    if (parsed.outcome !== "valid") {
      return jsonResponse({ outcome: parsed.outcome }, 400);
    }

    const result = await operations.invitePersistence.listAdminInvitePage(
      context.adminUser.id,
      parsed.query,
    );

    return result.outcome === "listed"
      ? jsonResponse({
          invites: result.items,
          pagination: result.pagination,
        }, 200)
      : refusalResponse(result);
  }

  const invite = await operations.invitePersistence.findAdminInviteById(
    context.route.inviteId,
  );
  const result = await operations.revokeInvite({
    adminUser: context.adminUser,
    invite,
  });

  return result.outcome === "revoked"
    ? jsonResponse({ outcome: result.outcome, invite: result.invite }, 200)
    : refusalResponse(result);
}

/** @returns {object} One-time secret-bearing creation representation. */
function toCreatedInvite(request, invite) {
  const url = new URL("/admin/invite", request.url);

  url.hash = invite.token;
  return {
    id: invite.id,
    createdAt: invite.createdAt,
    state: invite.state,
    url: url.toString(),
  };
}

/** @returns {Response} Current actor or Invite refusal. */
function refusalResponse(result) {
  return jsonResponse(
    { outcome: result.outcome },
    result.outcome === "admin-not-active" ? 403 : 409,
  );
}

/** @returns {Response} Non-cacheable narrow JSON. */
function jsonResponse(body, status) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
