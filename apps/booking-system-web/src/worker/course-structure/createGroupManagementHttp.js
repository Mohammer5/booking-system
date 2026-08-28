import {
  createArchiveGroup,
  createReactivateGroup,
  createUpdateGroup,
} from "@booking-system/booking";

import {
  jsonResponse,
  readJsonObject,
  toGroupResponse,
} from "./courseHttpContract.js";

/**
 * Compose the focused Group field and lifecycle domain operations.
 *
 * @param {object} capabilities Raw Course-structure capabilities.
 * @returns {object} Group management operations.
 */
export function createGroupManagementOperations(capabilities) {
  return {
    archiveGroup: createArchiveGroup({
      now: capabilities.now,
      archiveActiveGroup: capabilities.groupPersistence?.archiveActiveGroup,
    }),
    reactivateGroup: createReactivateGroup({
      reactivateArchivedGroup:
        capabilities.groupPersistence?.reactivateArchivedGroup,
    }),
    updateGroup: createUpdateGroup({
      updateGroupForActiveAdmin:
        capabilities.groupPersistence?.updateGroupForActiveAdmin,
    }),
  };
}

/**
 * Resolve server-owned Course, Group, fields, references, and domain result.
 *
 * @param {object} context Request, matched route, and current Admin.
 * @param {object} operations Course-structure operations.
 * @returns {Promise<object>} A direct response or language-neutral result.
 */
export async function resolveGroupManagementRequest(context, operations) {
  const { request, route, adminUser } = context;
  const course = await operations.coursePersistence.findCourseById(
    route.courseId,
  );

  if (course === null) {
    return { response: jsonResponse({ outcome: "course-not-found" }, 404) };
  }

  const group = await operations.groupPersistence.findGroupById(
    route.courseId,
    route.groupId,
  );

  if (group === null) {
    return { response: jsonResponse({ outcome: "group-not-found" }, 404) };
  }

  if (route.kind === "group") {
    return resolveGroupUpdate(
      { request, route, adminUser, course, group },
      operations,
    );
  }

  if (route.kind === "groupArchival") {
    return resolveGroupArchival(
      { route, adminUser, course, group },
      operations,
    );
  }

  return resolveGroupReactivation(
    { route, adminUser, course, group },
    operations,
  );
}

/** @returns {Promise<object>} One complete Group update result. */
async function resolveGroupUpdate(context, operations) {
  const [body, courseGroups] = await Promise.all([
    readJsonObject(context.request),
    operations.groupPersistence.listGroupsByCourseId(context.route.courseId),
  ]);
  const result = await operations.updateGroup({
    adminUser: context.adminUser,
    course: context.course,
    group: context.group,
    courseGroups,
    name: body.name,
    details: body.details,
  });

  return { result };
}

/** @returns {Promise<object>} One Group archival result. */
async function resolveGroupArchival(context, operations) {
  const selectionContexts =
    await operations.groupPersistence.listSelectionContextsByGroupId(
      context.route.courseId,
      context.route.groupId,
    );
  const result = await operations.archiveGroup({
    adminUser: context.adminUser,
    course: context.course,
    group: context.group,
    selectionContexts,
  });

  return { result };
}

/** @returns {Promise<object>} One Group reactivation result. */
async function resolveGroupReactivation(context, operations) {
  const courseGroups = await operations.groupPersistence.listGroupsByCourseId(
    context.route.courseId,
  );
  const result = await operations.reactivateGroup({
    adminUser: context.adminUser,
    course: context.course,
    group: context.group,
    courseGroups,
  });

  return { result };
}

/**
 * Map one non-actor/non-Course Group management result to exact HTTP.
 *
 * @param {object} resolution Group result and response kind.
 * @returns {Response} Narrow success or refusal response.
 */
export function groupManagementResultResponse({ result }) {
  if (result.outcome === "updated") {
    return jsonResponse(toGroupResponse(result.group), 200);
  }

  if (new Set(["archived", "reactivated"]).has(result.outcome)) {
    return jsonResponse(
      { outcome: result.outcome, group: toGroupResponse(result.group) },
      200,
    );
  }

  if (new Set(["invalid-name", "invalid-details"]).has(result.outcome)) {
    return jsonResponse(result, 422);
  }

  return jsonResponse(
    result,
    result.outcome === "group-not-found" ? 404 : 409,
  );
}
