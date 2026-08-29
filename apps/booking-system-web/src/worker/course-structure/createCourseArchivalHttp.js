import { createArchiveCourse } from "@booking-system/booking";

import { jsonResponse, toCourseResponse } from "./courseHttpContract.js";

/**
 * Compose the focused terminal Course archival operation.
 *
 * @param {object} capabilities Raw Course-structure capabilities.
 * @returns {object} Course archival operations.
 */
export function createCourseArchivalOperations(capabilities) {
  return {
    archiveCourse: createArchiveCourse({
      now: capabilities.now,
      archiveActiveCourse:
        capabilities.coursePersistence?.archiveActiveCourse,
    }),
  };
}

/**
 * Handle one body-free terminal Course archival action.
 *
 * @param {object} context Request, route, and current Admin.
 * @param {object} operations Course-structure operations.
 * @param {Function} resolveCurrentStateRefusal Shared stale resolver.
 * @returns {Promise<Response>} Exact archival response.
 */
export async function handleCourseArchivalRequest(
  context,
  operations,
  resolveCurrentStateRefusal,
) {
  const course = await operations.coursePersistence.findCourseById(
    context.route.courseId,
  );

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  const modules = await operations.modulePersistence.listModulesByCourseId(
    context.route.courseId,
  );
  const result = await operations.archiveCourse({
    adminUser: context.adminUser,
    course,
    modules,
  });
  const staleResponse = await resolveCurrentStateRefusal(
    result,
    { request: context.request, courseId: context.route.courseId },
    operations,
  );

  return staleResponse ?? courseArchivalResultResponse(result);
}

/** @returns {Response} Narrow Course archival result or current refusal. */
function courseArchivalResultResponse(result) {
  if (result.outcome === "archived") {
    return jsonResponse({
      outcome: "archived",
      course: toCourseResponse(result.course),
    }, 200);
  }

  return jsonResponse(
    result,
    result.outcome === "course-not-found" ? 404 : 409,
  );
}
