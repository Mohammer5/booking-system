import {
  createAssignParticipantToCourse,
  createDisableParticipant,
  createReenableParticipant,
  createResolveAdminContext,
  createRevokeCourseAssignment,
  createUpdateParticipantProfileAsAdmin,
} from "@booking-system/booking";

import {
  jsonResponse,
  matchCourseAccessRoute,
  readJsonObject,
  toAssignmentResponse,
  toParticipantResponse,
} from "./courseAccessHttpContract.js";
import { handleParticipantLifecycleRequest } from "./handleParticipantLifecycleRequest.js";

/**
 * Create Admin Participant-directory and Course-membership HTTP operations.
 *
 * @param {object} capabilities Application and booking capabilities.
 * @returns {(request: Request) => Promise<Response>} Course-access handler.
 */
export function createCourseAccessHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleCourseAccessHttpRequest(request) {
    try {
      const route = matchCourseAccessRoute(new URL(request.url).pathname);

      if (route === null || !isSupportedRoute(route, request.method)) {
        return jsonResponse({ outcome: "not-found" }, 404);
      }

      const authorization = await authorizeAdminRequest(request, operations);

      if (authorization.response !== undefined) {
        return authorization.response;
      }

      return await handleAuthorizedRoute(
        { request, route, adminUser: authorization.adminUser },
        operations,
      );
    } catch {
      return jsonResponse({ outcome: "technical-error" }, 500);
    }
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
    disableParticipant: createDisableParticipant({
      now: capabilities.now,
      disableActiveParticipant:
        capabilities.participantPersistence.disableActiveParticipant,
    }),
    reenableParticipant: createReenableParticipant({
      reenableDisabledParticipant:
        capabilities.participantPersistence.reenableDisabledParticipant,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
    revokeCourseAssignment: createRevokeCourseAssignment({
      now: capabilities.now,
      revokeActiveCourseAssignment:
        capabilities.assignmentPersistence.revokeActiveCourseAssignment,
    }),
    updateParticipantProfileAsAdmin: createUpdateParticipantProfileAsAdmin({
      updateParticipantProfileAsActiveAdmin:
        capabilities.participantPersistence
          .updateParticipantProfileAsActiveAdmin,
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
  if (route.kind === "participants") {
    return method === "GET";
  }

  if (route.kind === "assignment-revocation") {
    return method === "POST";
  }

  if (isParticipantLifecycleRoute(route)) {
    return method === "POST";
  }

  return route.kind === "participant"
    ? new Set(["GET", "PUT"]).has(method)
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

  if (context.route.kind === "participant") {
    return handleParticipantDetailRequest(context, operations);
  }

  if (isParticipantLifecycleRoute(context.route)) {
    return handleParticipantLifecycleRequest(
      context,
      operations,
      staleAdminResponse,
    );
  }

  if (context.route.kind === "assignment-revocation") {
    return handleAssignmentRevocationRequest(context, operations);
  }

  return context.request.method === "GET"
    ? handleAssignmentListRequest(context.route.courseId, operations)
    : handleAssignmentRequest(context, operations);
}

/** @returns {boolean} Whether one matched route is a Participant state action. */
function isParticipantLifecycleRoute(route) {
  return new Set([
    "participant-disablement",
    "participant-reenablement",
  ]).has(route.kind);
}

/** @returns {Promise<Response>} Revoke one retained Course Assignment. */
async function handleAssignmentRevocationRequest(context, operations) {
  const [course, assignment] = await Promise.all([
    operations.coursePersistence.findCourseById(context.route.courseId),
    operations.assignmentPersistence.findAssignmentById(
      context.route.assignmentId,
    ),
  ]);

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  if (assignment?.courseId !== course.id) {
    return jsonResponse({ outcome: "assignment-not-found" }, 404);
  }

  const result = await operations.revokeCourseAssignment({
    adminUser: context.adminUser,
    course,
    assignment,
  });

  return assignmentRevocationResultResponse(
    context.request,
    result,
    operations,
  );
}

/** @returns {Promise<Response>} Exact Assignment-revocation HTTP result. */
async function assignmentRevocationResultResponse(request, result, operations) {
  if (new Set(["revoked", "already-revoked"]).has(result.outcome)) {
    return jsonResponse(
      {
        outcome: result.outcome,
        assignment: {
          id: result.assignment.id,
          state: result.assignment.state,
        },
        removedSelectionCount: result.removedSelectionCount,
      },
      200,
    );
  }

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(request, operations);
  }

  return jsonResponse(result, 409);
}

/** @returns {Promise<Response>} Read or edit one Admin-visible Participant. */
async function handleParticipantDetailRequest(context, operations) {
  const participant =
    await operations.participantPersistence.findParticipantById(
      context.route.participantId,
    );

  if (participant === null) {
    return jsonResponse({ outcome: "participant-not-found" }, 404);
  }

  if (context.request.method === "GET") {
    return jsonResponse(toParticipantResponse(participant), 200);
  }

  const body = await readJsonObject(context.request);
  const result = await operations.updateParticipantProfileAsAdmin({
    adminUser: context.adminUser,
    participant,
    name: body.name,
    email: body.email,
  });

  return participantProfileResultResponse(context, result, operations);
}

/** @returns {Promise<Response>} Exact Admin profile-edit result response. */
async function participantProfileResultResponse(context, result, operations) {
  if (result.outcome === "updated") {
    return jsonResponse(toParticipantResponse(result.participant), 200);
  }

  if (new Set(["invalid-name", "invalid-email"]).has(result.outcome)) {
    return jsonResponse(result, 422);
  }

  if (result.outcome === "email-already-exists") {
    return jsonResponse(result, 409);
  }

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(context.request, operations);
  }

  return result.outcome === "participant-not-editable"
    ? jsonResponse({ outcome: "participant-not-found" }, 404)
    : jsonResponse(result, 409);
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

  if (
    new Set(["created", "reactivated", "already-active"]).has(result.outcome)
  ) {
    return jsonResponse(
      {
        outcome: result.outcome,
        assignment: toAssignmentResponse(result.assignment, participant),
      },
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
