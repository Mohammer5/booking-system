import {
  createRemoveParticipantModuleSelectionAsAdmin,
  createResolveAdminContext,
  createSetParticipantModuleSelectionAsAdmin,
  deriveAdminAssistedModuleSelectionAvailability,
  deriveModuleSelectionPresentation,
} from "@booking-system/booking";

import {
  administrativeParticipationJsonResponse,
  matchAdministrativeParticipationRoute,
  toAdministrativeParticipantParticipationResponse,
} from "./administrativeParticipationHttpContract.js";

/**
 * Create the Admin-only Course participation inspection handler.
 *
 * @param {object} capabilities Authentication, time, and guarded reads.
 * @returns {(request: Request) => Promise<Response>} Participation handler.
 */
export function createAdministrativeParticipationHttpHandler(capabilities) {
  const resolveAdminContext = createResolveAdminContext({
    findAdminUserByExternalPrincipalId:
      capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
  });

  return async function handleAdministrativeParticipationRequest(request) {
    try {
      const route = matchAdministrativeParticipationRoute(
        new URL(request.url).pathname,
      );

      if (route === null || !isSupportedMethod(route.kind, request.method)) {
        return response({ outcome: "not-found" }, 404);
      }

      const authorization = await authorizeAdmin(
        request,
        capabilities.authenticate,
        resolveAdminContext,
      );

      if (authorization.response !== undefined) {
        return authorization.response;
      }

      if (route.kind === "participant") {
        return await inspectParticipantParticipation(
          route,
          authorization.adminUser,
          capabilities,
        );
      }

      return await mutateParticipantSelection(
        {
          request,
          route,
          adminUser: authorization.adminUser,
          capabilities,
          operations: createSelectionOperations(capabilities),
        },
      );
    } catch {
      return response({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {boolean} Whether one exact route accepts the HTTP method. */
function isSupportedMethod(kind, method) {
  return kind === "selection"
    ? new Set(["PUT", "DELETE"]).has(method)
    : method === "GET";
}

/** @returns {object} Pure operations composed with guarded persistence. */
function createSelectionOperations(capabilities) {
  return {
    remove: createRemoveParticipantModuleSelectionAsAdmin({
      now: capabilities.now,
      removeParticipantModuleSelectionAsAdmin:
        capabilities.selectionPersistence.removeParticipantModuleSelectionAsAdmin,
    }),
    set: createSetParticipantModuleSelectionAsAdmin({
      createCourseAssignmentId: capabilities.createCourseAssignmentId,
      createModuleSelectionId: capabilities.createModuleSelectionId,
      now: capabilities.now,
      setParticipantModuleSelectionAsAdmin:
        capabilities.selectionPersistence.setParticipantModuleSelectionAsAdmin,
    }),
  };
}

/** @returns {Promise<object>} Current Active Admin or exact refusal. */
async function authorizeAdmin(request, authenticate, resolveAdminContext) {
  const authentication = await authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return { response: response({ outcome: "unauthenticated" }, 401) };
  }

  const context = await resolveAdminContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-admin"
    ? { adminUser: context.adminUser }
    : { response: response(context, 403) };
}

/** @returns {Promise<Response>} One target including no-Assignment state. */
async function inspectParticipantParticipation(route, adminUser, capabilities) {
  const result = await capabilities.persistence.findParticipantParticipation(
    adminUser.id,
    route.courseId,
    route.participantId,
  );

  if (result === null) {
    return response({ outcome: "participation-unavailable" }, 404);
  }

  const presented = presentParticipant(result, adminUser, capabilities.now());

  return response(
    toAdministrativeParticipantParticipationResponse(presented),
    200,
  );
}

/** @returns {Promise<Response>} Admin-assisted set or remove response. */
async function mutateParticipantSelection(context) {
  const { request, route, adminUser, capabilities, operations } = context;
  const result = await capabilities.persistence.findParticipantParticipation(
    adminUser.id,
    route.courseId,
    route.participantId,
  );

  if (result === null) {
    return response({ outcome: "participation-unavailable" }, 404);
  }

  const module = result.modules.find(({ id }) => id === route.moduleId);

  if (module === undefined) {
    return response({ outcome: "module-not-selectable" }, 404);
  }

  const input = {
    adminUser,
    participant: result.participation.participant,
    assignment: result.participation.assignment,
    course: result.course,
    module,
    selection: result.participation.selections.find(
      ({ moduleId }) => moduleId === module.id,
    ) ?? null,
  };

  if (request.method === "DELETE") {
    return mutationResponse(await operations.remove(input));
  }

  const body = await readJsonObject(request);

  if (typeof body.groupId !== "string" || body.groupId.length === 0) {
    return response({ outcome: "invalid-group-id" }, 422);
  }

  const group = result.groups.find(({ id }) => id === body.groupId);

  return group === undefined
    ? response({ outcome: "group-not-selectable" }, 409)
    : mutationResponse(await operations.set({ ...input, group }));
}

/** @returns {Response} Exact assisted success or current-state refusal. */
function mutationResponse(result) {
  if (new Set(["created", "changed", "already-selected"]).has(result.outcome)) {
    return response({
      outcome: result.outcome,
      assignmentOutcome: result.assignmentOutcome,
      assignment: {
        id: result.assignment.id,
        state: result.assignment.state,
      },
      selection: {
        id: result.selection.id,
        moduleId: result.selection.moduleId,
        groupId: result.selection.groupId,
      },
    }, result.outcome === "created" ? 201 : 200);
  }

  if (new Set(["removed", "already-absent"]).has(result.outcome)) {
    return response(result, 200);
  }

  return response(result, result.outcome === "admin-not-active" ? 403 : 409);
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

/** @returns {object} Target read with derived meaning and mutation availability. */
function presentParticipant(result, adminUser, now) {
  const participation = result.participation;
  const modulesById = new Map(
    result.modules.map((module) => [module.id, module]),
  );

  return {
    ...result,
    modules: result.modules.map((module) => ({
      ...module,
      selectionAvailability: deriveAdminAssistedModuleSelectionAvailability({
        adminUser,
        participant: participation.participant,
        course: result.course,
        module,
        now,
      }),
    })),
    participation: {
      ...participation,
      selections: participation.selections.map((selection) =>
        deriveModuleSelectionPresentation({
          selection,
          participant: participation.participant,
          assignment: participation.assignment,
          course: result.course,
          module: modulesById.get(selection.moduleId),
          now,
        }),
      ),
    },
  };
}

/** @returns {Response} One no-store Admin participation response. */
function response(body, status) {
  return administrativeParticipationJsonResponse(body, status);
}
