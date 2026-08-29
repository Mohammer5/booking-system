import {
  createClaimAdminInvite,
  recognizeAdminInvite,
} from "@booking-system/booking";

const tokenPattern = /^[0-9a-f]{64}$/;

/**
 * Create public recognition, continuation, and invited Admin claim handling.
 *
 * @param {object} capabilities Authentication, secret, identity, and persistence capabilities.
 * @returns {(request: Request) => Promise<Response>} Admin Invite onboarding handler.
 */
export function createAdminInviteOnboardingHttpHandler(capabilities) {
  const claimInvite = createClaimAdminInvite({
    createAdminUserId: capabilities.createAdminUserId,
    claimActiveAdminInvite:
      capabilities.invitePersistence.claimActiveAdminInvite,
  });
  const operations = { ...capabilities, claimInvite };

  return async function handleAdminInviteOnboardingHttpRequest(request) {
    try {
      const route = matchRoute(request);

      if (route === null) return jsonResponse({ outcome: "not-found" }, 404);
      if (route === "recognition") {
        return await handleInitialRecognition(request, operations);
      }

      if (route === "continuation") {
        return await handleContinuation(request, operations);
      }

      return await handleClaim(request, operations);
    } catch {
      return jsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {"recognition" | "continuation" | "claim" | null} Exact route. */
function matchRoute(request) {
  const route = `${request.method} ${new URL(request.url).pathname}`;
  const routes = new Map([
    ["POST /api/admin-invite/recognition", "recognition"],
    ["GET /api/admin-invite/continuation", "continuation"],
    ["POST /api/admin-invite/claim", "claim"],
  ]);

  return routes.get(route) ?? null;
}

/** @returns {Promise<Response>} Recognize raw authority and replace it. */
async function handleInitialRecognition(request, operations) {
  const body = await readJsonObject(request);

  if (!tokenPattern.test(body.token)) {
    return unavailableResponse(request, operations, { clearCookie: true });
  }

  const digest = await operations.hashAdminInviteToken(body.token);
  const resolution = await resolveRecognition(digest, operations);

  if (resolution.result.outcome !== "available") {
    return unavailableResponse(request, operations, { clearCookie: true });
  }

  const cookie = await operations.inviteContinuation.issueCookie(
    request,
    digest,
  );

  return jsonResponse(resolution.result, 200, { "set-cookie": cookie });
}

/** @returns {Promise<Response>} Recheck one signed digest continuation. */
async function handleContinuation(request, operations) {
  const resolution = await resolveContinuation(request, operations);

  return resolution?.result.outcome === "available"
    ? jsonResponse(resolution.result, 200)
    : unavailableResponse(request, operations, {
        clearCookie: resolution !== null,
      });
}

/** @returns {Promise<Response>} Atomically create ordinary Admin and claim. */
async function handleClaim(request, operations) {
  const resolution = await resolveContinuation(request, operations);

  if (resolution?.result.outcome !== "available") {
    return unavailableResponse(request, operations, {
      clearCookie: resolution !== null,
      status: 409,
    });
  }

  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return jsonResponse({ outcome: "unauthenticated" }, 401);
  }

  const [body, currentAdminUser] = await Promise.all([
    readJsonObject(request),
    operations.adminPersistence.findAdminUserByExternalPrincipalId(
      authentication.externalPrincipalId,
    ),
  ]);
  const result = await operations.claimInvite({
    externalPrincipalId: authentication.externalPrincipalId,
    name: body.name,
    currentAdminUser,
    invite: resolution.invite,
  });

  return claimResponse(request, result, operations);
}

/** @returns {Promise<object | null>} Verified cookie plus current Invite. */
async function resolveContinuation(request, operations) {
  const digest = await operations.inviteContinuation.readDigest(request);

  return digest === null ? null : resolveRecognition(digest, operations);
}

/** @returns {Promise<object>} Internal Invite plus public availability only. */
async function resolveRecognition(digest, operations) {
  const invite = await operations.invitePersistence
    .findRecognizedAdminInviteByDigest(digest);

  return { invite, result: recognizeAdminInvite(invite) };
}

/** @returns {Response} Created Admin or exact safe refusal. */
function claimResponse(request, result, operations) {
  if (result.outcome === "created") {
    return jsonResponse({
      outcome: result.outcome,
      adminUser: toAdminResponse(result.adminUser),
    }, 201, {
      "set-cookie": operations.inviteContinuation.clearCookie(request),
    });
  }

  if (result.outcome === "invalid-name") {
    return jsonResponse(result, 422);
  }

  if (result.outcome === "admin-user-already-exists") {
    return jsonResponse(result, 409);
  }

  return unavailableResponse(request, operations, {
    clearCookie: true,
    status: 409,
  });
}

/** @returns {object} Narrow newly created ordinary Admin metadata. */
function toAdminResponse(adminUser) {
  return {
    id: adminUser.id,
    name: adminUser.name,
    state: adminUser.state,
    authority: adminUser.authority,
  };
}

/** @returns {Response} One common unavailable result with optional clearing. */
function unavailableResponse(request, operations, options = {}) {
  const headers = options.clearCookie === true
    ? { "set-cookie": operations.inviteContinuation.clearCookie(request) }
    : {};

  return jsonResponse(
    { outcome: "invite-unavailable" },
    options.status ?? 404,
    headers,
  );
}

/** @returns {Promise<object>} Parsed object or empty invalid-field input. */
async function readJsonObject(request) {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/** @returns {Response} Non-cacheable narrow JSON response. */
function jsonResponse(body, status, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}
