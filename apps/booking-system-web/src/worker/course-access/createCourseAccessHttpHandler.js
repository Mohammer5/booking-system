import {
  createAssignParticipantToCourse,
  createResolveAdminContext,
} from "@booking-system/booking";

import {
  jsonResponse,
  matchCourseAccessRoute,
  readJsonObject,
  toAssignmentResponse,
  toParticipantResponse,
} from "./courseAccessHttpContract.js";

/**
 * Create Admin Participant-directory and Course-membership HTTP operations.
 *
 * @param {object} capabilities Application and booking capabilities.
 * @returns {(request: Request) => Promise<Response>} Course-access handler.
 */
export function createCourseAccessHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleCourseAccessHttpRequest(request) {
    const route = matchCourseAccessRoute(new URL(request.url).pathname);

    if (route === null || !isSupportedRoute(route, request.method)) {
      return jsonResponse({ outcome: "not-found" }, 404);
    }

    const authorization = await authorizeAdminRequest(request, operations);

    if (authorization.response !== undefined) {
      return authorization.response;
    }

    return handleAuthorizedRoute(
      { request, route, adminUser: authorization.adminUser },
      operations,
    );
  };
}

/**
 * Compose narrow booking operations once per Worker request graph.
 *
 * @param {object} capabilities Raw application capabilities.
 * @returns {object} Course-access HTTP operations.
 */
function createOperations(capabilities) {
  return {
    ...capabilities,
    assignParticipant: createAssignParticipantToCourse({
      createCourseAssignmentId: capabilities.createCourseAssignmentId,
      assignParticipantToActiveCourse:
        capabilities.assignmentPersistence.assignParticipantToActiveCourse,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
  };
}

/**
 * Check the exact methods supported by one Course-access resource.
 *
 * @param {object} route Matched route.
 * @param {string} method Request method.
 * @returns {boolean} Whether the operation exists.
 */
function isSupportedRoute(route, method) {
  return route.kind === "participants"
    ? method === "GET"
    : new Set(["GET", "POST"]).has(method);
}

/**
 * Dispatch one freshly authorized Course-access request.
 *
 * @param {object} context Request, route, and current Admin.
 * @param {object} operations Course-access operations.
 * @returns {Promise<Response>} Exact operation response.
 */
function handleAuthorizedRoute(context, operations) {
  if (context.route.kind === "participants") {
    return handleParticipantListRequest(operations);
  }

  return context.request.method === "GET"
    ? handleAssignmentListRequest(context.route.courseId, operations)
    : handleAssignmentRequest(context, operations);
}

/**
 * List every registered Participant after fresh Admin authorization.
 *
 * @param {object} operations Course-access operations.
 * @returns {Promise<Response>} Participant directory response.
 */
async function handleParticipantListRequest(operations) {
  const participants = await operations.participantPersistence.listParticipants();

  return jsonResponse(
    { participants: participants.map(toParticipantResponse) },
    200,
  );
}

/**
 * List current Course memberships for an Active or Archived Course.
 *
 * @param {string} courseId Course identity.
 * @param {object} operations Course-access operations.
 * @returns {Promise<Response>} Course Assignment collection response.
 */
async function handleAssignmentListRequest(courseId, operations) {
  const course = await operations.coursePersistence.findCourseById(courseId);

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  const assignments =
    await operations.assignmentPersistence.listAssignmentsByCourseId(courseId);

  return jsonResponse(
    { assignments: assignments.map((value) => toAssignmentResponse(value)) },
    200,
  );
}

/**
 * Establish direct Course membership from server-resolved current state.
 *
 * @param {object} context Request, route, and current Admin.
 * @param {object} operations Course-access operations.
 * @returns {Promise<Response>} Assignment response or precise refusal.
 */
async function handleAssignmentRequest(context, operations) {
  const { request, route, adminUser } = context;
  const body = await readJsonObject(request);

  if (typeof body.participantId !== "string" || body.participantId.length === 0) {
    return jsonResponse({ outcome: "invalid-participant-id" }, 422);
  }

  const [course, participant] = await Promise.all([
    operations.coursePersistence.findCourseById(route.courseId),
    operations.participantPersistence.findParticipantById(body.participantId),
  ]);

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  if (participant === null) {
    return jsonResponse({ outcome: "participant-not-found" }, 404);
  }

  const result = await operations.assignParticipant({
    adminUser,
    course,
    participant,
  });

  return assignmentResultResponse(
    { result, participant, request },
    operations,
  );
}

/**
 * Translate one domain/persistence Assignment result to HTTP.
 *
 * @param {object} context Result, Participant, and incoming request.
 * @param {object} operations Course-access operations.
 * @returns {Promise<Response>} Exact Assignment result response.
 */
async function assignmentResultResponse(context, operations) {
  const { result, participant, request } = context;

  if (new Set(["created", "already-active"]).has(result.outcome)) {
    return jsonResponse(
      toAssignmentResponse(result.assignment, participant),
      result.outcome === "created" ? 201 : 200,
    );
  }

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(request, operations);
  }

  const statuses = new Map([
    ["course-not-active", 409],
    ["participant-not-assignable", 409],
    ["assignment-not-active", 409],
    ["assignment-not-created", 409],
  ]);

  return jsonResponse(result, statuses.get(result.outcome) ?? 409);
}

/**
 * Authenticate and freshly resolve Active Admin state.
 *
 * @param {Request} request Incoming request.
 * @param {object} operations Course-access operations.
 * @returns {Promise<object>} Active Admin or exact refusal response.
 */
async function authorizeAdminRequest(request, operations) {
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

/**
 * Re-resolve an actor rejected by guarded Assignment persistence.
 *
 * @param {Request} request Incoming request.
 * @param {object} operations Course-access operations.
 * @returns {Promise<Response>} Current Admin refusal response.
 */
async function staleAdminResponse(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  return authorization.response ??
    jsonResponse({ outcome: "admin-not-active" }, 403);
}
