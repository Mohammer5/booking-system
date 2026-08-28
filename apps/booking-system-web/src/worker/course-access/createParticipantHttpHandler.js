import {
  createRegisterParticipant,
  createResolveParticipantContext,
  createUpdateOwnParticipantProfile,
} from "@booking-system/booking";

/**
 * Create Participant-context HTTP operations.
 *
 * @param {object} capabilities Application and booking capabilities.
 * @returns {(request: Request) => Promise<Response>} The Participant handler.
 */
export function createParticipantHttpHandler({
  authenticate,
  createParticipantId,
  persistence,
}) {
  const registerParticipant = createRegisterParticipant({
    createParticipantId,
    registerParticipant: persistence.registerParticipant,
  });
  const resolveParticipantContext = createResolveParticipantContext({
    findParticipantByExternalPrincipalId:
      persistence.findParticipantByExternalPrincipalId,
  });
  const updateOwnParticipantProfile = createUpdateOwnParticipantProfile({
    updateActiveParticipantProfile: persistence.updateActiveParticipantProfile,
  });

  return async function handleParticipantHttpRequest(request) {
    try {
      const route = `${request.method} ${new URL(request.url).pathname}`;

      if (route === "GET /api/participant/me") {
        return await handleCurrentParticipant(request, {
          authenticate,
          resolveParticipantContext,
        });
      }

      if (route === "PUT /api/participant/me") {
        return await handleParticipantProfileUpdate(request, {
          authenticate,
          resolveParticipantContext,
          updateOwnParticipantProfile,
        });
      }

      if (route === "POST /api/participant/onboarding") {
        return await handleParticipantOnboarding(request, {
          authenticate,
          registerParticipant,
        });
      }

      return jsonResponse({ outcome: "not-found" }, 404);
    } catch {
      return jsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/**
 * Translate current Participant resolution to its narrow HTTP contract.
 *
 * @param {Request} request Incoming current-context request.
 * @param {object} operations Authentication and booking operations.
 * @returns {Promise<Response>} Current Participant response.
 */
async function handleCurrentParticipant(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return jsonResponse({ outcome: "unauthenticated" }, 401);
  }

  const context = await operations.resolveParticipantContext(
    authentication.externalPrincipalId,
  );

  if (context.outcome === "no-participant") {
    return jsonResponse(context, 403);
  }

  if (context.outcome === "disabled-participant") {
    return jsonResponse(context, 403);
  }

  return jsonResponse(toCurrentParticipant(context.participant), 200);
}

/**
 * Accept complete onboarding only for the authenticated external principal.
 *
 * @param {Request} request Incoming onboarding request.
 * @param {object} operations Authentication and booking operations.
 * @returns {Promise<Response>} Registration response.
 */
async function handleParticipantOnboarding(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return jsonResponse({ outcome: "unauthenticated" }, 401);
  }

  const body = await readJsonObject(request);
  const result = await operations.registerParticipant({
    externalPrincipalId: authentication.externalPrincipalId,
    name: body.name,
    email: body.email,
  });

  if (result.outcome === "invalid-name" || result.outcome === "invalid-email") {
    return jsonResponse(result, 422);
  }

  if (
    result.outcome === "participant-already-exists" ||
    result.outcome === "email-already-exists"
  ) {
    return jsonResponse(result, 409);
  }

  return jsonResponse(toCurrentParticipant(result.participant), 201);
}

/**
 * Replace the freshly resolved Active Participant's complete profile.
 *
 * @param {Request} request Incoming profile update request.
 * @param {object} operations Authentication, context, and update operations.
 * @returns {Promise<Response>} Updated profile or narrow refusal.
 */
async function handleParticipantProfileUpdate(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return jsonResponse({ outcome: "unauthenticated" }, 401);
  }

  const context = await operations.resolveParticipantContext(
    authentication.externalPrincipalId,
  );

  if (context.outcome !== "active-participant") {
    return jsonResponse(context, 403);
  }

  const body = await readJsonObject(request);
  const result = await operations.updateOwnParticipantProfile({
    participant: context.participant,
    name: body.name,
    email: body.email,
  });

  if (result.outcome === "updated") {
    return jsonResponse(toCurrentParticipant(result.participant), 200);
  }

  if (new Set(["invalid-name", "invalid-email"]).has(result.outcome)) {
    return jsonResponse(result, 422);
  }

  if (result.outcome === "email-already-exists") {
    return jsonResponse(result, 409);
  }

  return jsonResponse(
    result,
    result.outcome === "participant-not-active" ? 403 : 409,
  );
}

/**
 * Read one narrow JSON object, treating malformed input as invalid fields.
 *
 * @param {Request} request Incoming request.
 * @returns {Promise<object>} Parsed object or empty input.
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
 * Remove application-private principal and normalization data.
 *
 * @param {object} participant Booking-domain Participant.
 * @returns {object} Narrow browser representation.
 */
function toCurrentParticipant(participant) {
  return {
    id: participant.id,
    name: participant.name,
    email: participant.email,
    state: participant.state,
  };
}

/**
 * Create one JSON response without a universal envelope.
 *
 * @param {object} body Response body.
 * @param {number} status HTTP status.
 * @returns {Response} JSON response.
 */
function jsonResponse(body, status) {
  return Response.json(body, { status });
}
