import {
  adminCollectionConfigurations,
  parseAdminCollectionQuery,
} from "../admin-collections/index.js";
import {
  jsonResponse,
  parseParticipantOptionQuery,
  toAssignmentResponse,
  toParticipantResponse,
} from "./courseAccessHttpContract.js";

/** @returns {Promise<Response>} One validated Participant/Assignment read. */
export function handleCourseAccessCollectionRequest(
  context,
  operations,
  staleAdminResponse,
) {
  if (context.route.kind === "participants") {
    return handleParticipantListRequest(context, operations, staleAdminResponse);
  }

  if (context.route.kind === "participant-options") {
    return handleParticipantOptionRequest(context, operations, staleAdminResponse);
  }

  return handleAssignmentListRequest(context, operations, staleAdminResponse);
}

/** @returns {Promise<Response>} One global Participant collection page. */
async function handleParticipantListRequest(context, operations, staleResponse) {
  const parsed = parseAdminCollectionQuery(
    new URL(context.request.url).searchParams,
    adminCollectionConfigurations.participants,
  );

  if (parsed.outcome !== "valid") {
    return jsonResponse({ outcome: parsed.outcome }, 400);
  }

  const result = await operations.participantPersistence.listParticipantPage(
    context.adminUser.id,
    parsed.query,
  );

  if (result.outcome === "admin-not-active") {
    return staleResponse(context.request, operations);
  }

  return jsonResponse({
    participants: result.items.map(toParticipantResponse),
    pagination: result.pagination,
  }, 200);
}

/** @returns {Promise<Response>} Bounded Course-specific Participant options. */
async function handleParticipantOptionRequest(context, operations, staleResponse) {
  const parsed = parseParticipantOptionQuery(
    new URL(context.request.url).searchParams,
  );

  if (parsed.outcome !== "valid") {
    return jsonResponse({ outcome: parsed.outcome }, 400);
  }

  const result = await operations.assignmentPersistence.listParticipantOptions(
    context.adminUser.id,
    context.route.courseId,
    parsed.q,
  );

  if (result.outcome === "admin-not-active") {
    return staleResponse(context.request, operations);
  }

  return result.outcome === "parent-not-found"
    ? jsonResponse({ outcome: "course-not-found" }, 404)
    : jsonResponse({
        course: toCourseContextResponse(result.course),
        participants: result.participants,
      }, 200);
}

/** @returns {Promise<Response>} One Course Assignment collection page. */
async function handleAssignmentListRequest(context, operations, staleResponse) {
  const parsed = parseAdminCollectionQuery(
    new URL(context.request.url).searchParams,
    adminCollectionConfigurations.assignments,
  );

  if (parsed.outcome !== "valid") {
    return jsonResponse({ outcome: parsed.outcome }, 400);
  }

  const result = await operations.assignmentPersistence.listAssignmentPage(
    context.adminUser.id,
    context.route.courseId,
    parsed.query,
  );

  if (result.outcome === "admin-not-active") {
    return staleResponse(context.request, operations);
  }

  if (result.outcome === "parent-not-found") {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  return jsonResponse({
    course: toCourseContextResponse(result.context),
    assignments: result.items.map((assignment) =>
      toAssignmentResponse(assignment)),
    pagination: result.pagination,
  }, 200);
}

/** @returns {object} Minimum Course collection context. */
function toCourseContextResponse(course) {
  return {
    id: course.id,
    name: course.name,
    timezone: course.timezone,
    state: course.state,
  };
}
