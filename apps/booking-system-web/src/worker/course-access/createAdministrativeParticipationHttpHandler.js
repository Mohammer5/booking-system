import {
  createResolveAdminContext,
  deriveModuleSelectionPresentation,
} from "@booking-system/booking";

import {
  administrativeParticipationJsonResponse,
  matchAdministrativeParticipationRoute,
  toAdministrativeParticipationResponse,
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

      if (route === null || request.method !== "GET") {
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

      return await inspectCourseParticipation(
        route.courseId,
        authorization.adminUser,
        capabilities,
      );
    } catch {
      return response({ outcome: "technical-error" }, 500);
    }
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

/** @returns {Promise<Response>} Complete derived Course participation. */
async function inspectCourseParticipation(courseId, adminUser, capabilities) {
  const result = await capabilities.persistence.findCourseParticipation(
    adminUser.id,
    courseId,
  );

  if (result === null) {
    return response({ outcome: "participation-unavailable" }, 404);
  }

  const presented = presentSelections(result, capabilities.now());

  return response(toAdministrativeParticipationResponse(presented), 200);
}

/** @returns {object} Read model with authoritative derived Selection meaning. */
function presentSelections(result, now) {
  const modulesById = new Map(
    result.modules.map((module) => [module.id, module]),
  );

  return {
    ...result,
    participations: result.participations.map((participation) => ({
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
    })),
  };
}

/** @returns {Response} One no-store Admin participation response. */
function response(body, status) {
  return administrativeParticipationJsonResponse(body, status);
}
