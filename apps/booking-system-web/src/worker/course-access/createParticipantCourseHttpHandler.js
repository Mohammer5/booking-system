import {
  createGetParticipantCourse,
  createListParticipantCourses,
  createResolveParticipantContext,
  deriveModuleSelectionAvailability,
  deriveModuleSelectionPresentation,
} from "@booking-system/booking";

import {
  matchParticipantCourseRoute,
  participantCourseJsonResponse,
  toParticipantCourseDetailResponse,
  toParticipantCourseResponse,
} from "./participantCourseHttpContract.js";

/**
 * Create Participant-facing Course list and stable-detail HTTP operations.
 *
 * @param {object} capabilities Authentication and Participant Course reads.
 * @returns {(request: Request) => Promise<Response>} Participant Course handler.
 */
export function createParticipantCourseHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleParticipantCourseHttpRequest(request) {
    try {
      const route = matchParticipantCourseRoute(new URL(request.url).pathname);

      if (route === null || request.method !== "GET") {
        return participantCourseJsonResponse({ outcome: "not-found" }, 404);
      }

      const authorization = await authorizeParticipantRequest(
        request,
        operations,
      );

      return await (authorization.response ??
        handleAuthorizedRoute(route, authorization.participant, operations));
    } catch {
      return participantCourseJsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {object} Composed domain operations. */
function createOperations(capabilities) {
  return {
    ...capabilities,
    getParticipantCourse: createGetParticipantCourse({
      findParticipantCourseMembership:
        capabilities.persistence.findParticipantCourseMembership,
    }),
    listParticipantCourses: createListParticipantCourses({
      listParticipantCourseMemberships:
        capabilities.persistence.listParticipantCourseMemberships,
    }),
    resolveParticipantContext: createResolveParticipantContext({
      findParticipantByExternalPrincipalId:
        capabilities.participantPersistence.findParticipantByExternalPrincipalId,
    }),
  };
}

/** @returns {Promise<Response>} Authorized list or detail response. */
async function handleAuthorizedRoute(route, participant, operations) {
  if (route.kind === "courses") {
    const result = await operations.listParticipantCourses(participant);

    return participantCourseJsonResponse(
      { courses: result.courses.map(toParticipantCourseResponse) },
      200,
    );
  }

  const result = await operations.getParticipantCourse({
    participant,
    courseId: route.courseId,
  });

  return result.outcome === "course-available"
    ? participantCourseJsonResponse(
        toParticipantCourseDetailResponse(
          presentParticipantCourse(result, participant, operations.now()),
        ),
        200,
      )
    : participantCourseJsonResponse({ outcome: "course-unavailable" }, 404);
}

/** @returns {object} Course detail with own Selection meaning derived now. */
function presentParticipantCourse(result, participant, now) {
  return {
    ...result,
    modules: result.modules.map((module) => ({
      ...module,
      selectionAvailability: deriveModuleSelectionAvailability({
        participant,
        assignment: result.assignment,
        course: result.course,
        module,
        now,
      }),
      selection: deriveModuleSelectionPresentation({
        selection: module.selection,
        participant,
        assignment: result.assignment,
        course: result.course,
        module,
        now,
      }),
    })),
  };
}

/** @returns {Promise<object>} Current Active Participant or exact refusal. */
async function authorizeParticipantRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return {
      response: participantCourseJsonResponse(
        { outcome: "unauthenticated" },
        401,
      ),
    };
  }

  const context = await operations.resolveParticipantContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-participant"
    ? { participant: context.participant }
    : { response: participantCourseJsonResponse(context, 403) };
}
