import { createCancelModule } from "@booking-system/booking";

import { jsonResponse, toModuleResponse } from "./courseHttpContract.js";

/**
 * Compose the focused Module cancellation domain operation.
 *
 * @param {object} capabilities Raw Course-structure capabilities.
 * @returns {object} Module cancellation operations.
 */
export function createModuleCancellationOperations(capabilities) {
  return {
    cancelModule: createCancelModule({
      now: capabilities.now,
      cancelScheduledModule:
        capabilities.modulePersistence?.cancelScheduledModule,
    }),
  };
}

/**
 * Handle one no-body terminal Module cancellation action.
 *
 * @param {object} context Request, route, and current Admin.
 * @param {object} operations Course-structure operations.
 * @param {Function} resolveCurrentStateRefusal Shared stale resolver.
 * @returns {Promise<Response>} Exact cancellation response.
 */
export async function handleModuleCancellationRequest(
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

  const module = await operations.modulePersistence.findModuleById(
    context.route.courseId,
    context.route.moduleId,
  );

  if (module === null) {
    return jsonResponse({ outcome: "module-not-found" }, 404);
  }

  const result = await operations.cancelModule({
    adminUser: context.adminUser,
    course,
    module,
  });
  const staleResponse = await resolveCurrentStateRefusal(
    result,
    { request: context.request, courseId: context.route.courseId },
    operations,
  );

  return staleResponse ?? cancellationResultResponse(result, operations.now());
}

/** @returns {Response} Narrow cancellation success or current-state refusal. */
function cancellationResultResponse(result, currentInstant) {
  if (result.outcome === "cancelled") {
    return jsonResponse({
      outcome: "cancelled",
      module: toModuleResponse(result.module, currentInstant),
    }, 200);
  }

  return jsonResponse(
    result,
    result.outcome === "module-not-found" ? 404 : 409,
  );
}
