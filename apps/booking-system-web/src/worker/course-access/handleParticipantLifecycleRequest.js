import {
  jsonResponse,
  toParticipantResponse,
} from "./courseAccessHttpContract.js";

/**
 * Disable or Re-enable one freshly resolved retained Participant.
 *
 * @param {object} context Authorized request and lifecycle route.
 * @param {object} operations Participant lifecycle operations.
 * @param {(request: Request, operations: object) => Promise<Response>} staleAdminResponse Re-resolve a stale actor.
 * @returns {Promise<Response>} Exact lifecycle success or refusal.
 */
export async function handleParticipantLifecycleRequest(
  context,
  operations,
  staleAdminResponse,
) {
  const participant =
    await operations.participantPersistence.findParticipantById(
      context.route.participantId,
    );

  if (participant === null) {
    return jsonResponse({ outcome: "participant-not-found" }, 404);
  }

  const operation =
    context.route.kind === "participant-disablement"
      ? operations.disableParticipant
      : operations.reenableParticipant;
  const result = await operation({
    adminUser: context.adminUser,
    participant,
  });

  return participantLifecycleResultResponse({
    request: context.request,
    result,
    operations,
    staleAdminResponse,
  });
}

/** @returns {Promise<Response>} Exact Participant-lifecycle HTTP result. */
async function participantLifecycleResultResponse(context) {
  const { request, result, operations, staleAdminResponse } = context;

  if (new Set(["disabled", "re-enabled"]).has(result.outcome)) {
    return jsonResponse(
      {
        outcome: result.outcome,
        participant: toParticipantResponse(result.participant),
        ...(result.outcome === "disabled"
          ? { removedSelectionCount: result.removedSelectionCount }
          : {}),
      },
      200,
    );
  }

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(request, operations);
  }

  return result.outcome === "participant-not-editable"
    ? jsonResponse({ outcome: "participant-not-found" }, 404)
    : jsonResponse(result, 409);
}
