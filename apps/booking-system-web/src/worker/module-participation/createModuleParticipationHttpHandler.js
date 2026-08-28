import {
  createRemoveParticipantModuleSelection,
  createResolveParticipantContext,
  createSetParticipantModuleSelection,
} from "@booking-system/booking";

const participantCoursePrefix = "/api/participant/courses/";

/**
 * Create Participant-owned Module Selection HTTP operations.
 *
 * @param {object} capabilities Authentication, time, reads, and persistence.
 * @returns {(request: Request) => Promise<Response>} Selection HTTP handler.
 */
export function createModuleParticipationHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleModuleParticipationHttpRequest(request) {
    try {
      const route = matchModuleSelectionRoute(new URL(request.url).pathname);

      if (route === null || !new Set(["PUT", "DELETE"]).has(request.method)) {
        return jsonResponse({ outcome: "not-found" }, 404);
      }

      const authorization = await authorizeParticipantRequest(
        request,
        operations,
      );

      if (authorization.response !== undefined) {
        return authorization.response;
      }

      return handleAuthorizedMutation(
        { request, route, participant: authorization.participant },
        operations,
      );
    } catch {
      return jsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {object} Composed domain operations. */
function createOperations(capabilities) {
  return {
    ...capabilities,
    removeSelection: createRemoveParticipantModuleSelection({
      now: capabilities.now,
      removeParticipantModuleSelection:
        capabilities.selectionPersistence.removeParticipantModuleSelection,
    }),
    resolveParticipantContext: createResolveParticipantContext({
      findParticipantByExternalPrincipalId:
        capabilities.participantPersistence.findParticipantByExternalPrincipalId,
    }),
    setSelection: createSetParticipantModuleSelection({
      createModuleSelectionId: capabilities.createModuleSelectionId,
      now: capabilities.now,
      setParticipantModuleSelection:
        capabilities.selectionPersistence.setParticipantModuleSelection,
    }),
  };
}

/** @returns {Promise<Response>} Mutation against one freshly loaded membership. */
async function handleAuthorizedMutation(context, operations) {
  const { request, route, participant } = context;
  const membership =
    await operations.participantCoursePersistence.findParticipantCourseMembership(
      participant.id,
      route.courseId,
    );

  if (membership === null) {
    return jsonResponse({ outcome: "course-unavailable" }, 404);
  }

  const module = membership.modules.find(({ id }) => id === route.moduleId);

  if (module === undefined) {
    return jsonResponse({ outcome: "module-not-selectable" }, 409);
  }

  const input = {
    participant,
    assignment: membership.assignment,
    course: membership.course,
    module,
  };

  return request.method === "DELETE"
    ? mutationResponse(await operations.removeSelection(input))
    : handleSetRequest(
        { request, input, groups: membership.groups },
        operations,
      );
}

/** @returns {Promise<Response>} Explicit Group-choice set/change response. */
async function handleSetRequest(context, operations) {
  const body = await readJsonObject(context.request);

  if (typeof body.groupId !== "string" || body.groupId.length === 0) {
    return jsonResponse({ outcome: "invalid-group-id" }, 422);
  }

  const group = context.groups.find(({ id }) => id === body.groupId);

  if (group === undefined) {
    return jsonResponse({ outcome: "group-not-selectable" }, 409);
  }

  return mutationResponse(
    await operations.setSelection({ ...context.input, group }),
  );
}

/** @returns {Response} Exact success or current-state refusal response. */
function mutationResponse(result) {
  if (new Set(["created", "changed", "already-selected"]).has(result.outcome)) {
    return jsonResponse(
      {
        outcome: result.outcome,
        selection: toSelectionResponse(result.selection),
      },
      result.outcome === "created" ? 201 : 200,
    );
  }

  if (new Set(["removed", "already-absent"]).has(result.outcome)) {
    return jsonResponse(result, 200);
  }

  return jsonResponse(result, 409);
}

/** @returns {Promise<object>} Current Active Participant or exact refusal. */
async function authorizeParticipantRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return { response: jsonResponse({ outcome: "unauthenticated" }, 401) };
  }

  const context = await operations.resolveParticipantContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-participant"
    ? { participant: context.participant }
    : { response: jsonResponse(context, 403) };
}

/** @returns {object | null} Stable Course/Module Selection resource route. */
function matchModuleSelectionRoute(pathname) {
  if (!pathname.startsWith(participantCoursePrefix)) {
    return null;
  }

  const segments = pathname.slice(participantCoursePrefix.length).split("/");

  return segments.length === 4 &&
    segments[0].length > 0 &&
    segments[1] === "modules" &&
    segments[2].length > 0 &&
    segments[3] === "selection"
    ? { courseId: segments[0], moduleId: segments[2] }
    : null;
}

/** @returns {Promise<object>} Parsed narrow input or an empty object. */
async function readJsonObject(request) {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/** @returns {object} Narrow Selection mutation representation. */
function toSelectionResponse(selection) {
  return {
    id: selection.id,
    moduleId: selection.moduleId,
    groupId: selection.groupId,
  };
}

/** @returns {Response} One JSON response. */
function jsonResponse(body, status) {
  return Response.json(body, { status });
}
