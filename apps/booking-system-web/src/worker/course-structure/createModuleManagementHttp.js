import {
  createDeleteModule,
  createRescheduleModule,
  createUpdateModuleDetails,
} from "@booking-system/booking";

import {
  jsonResponse,
  readJsonObject,
  toModuleResponse,
} from "./courseHttpContract.js";

/**
 * Compose focused Module descriptive and schedule operations.
 *
 * @param {object} capabilities Raw Course-structure capabilities.
 * @returns {object} Module management operations.
 */
export function createModuleManagementOperations(capabilities) {
  return {
    deleteModule: createDeleteModule({
      deleteUnreferencedModule:
        capabilities.modulePersistence?.deleteUnreferencedModule,
    }),
    rescheduleModule: createRescheduleModule({
      now: capabilities.now,
      rescheduleModuleForActiveAdmin:
        capabilities.modulePersistence?.rescheduleModuleForActiveAdmin,
    }),
    updateModuleDetails: createUpdateModuleDetails({
      updateModuleDetailsForActiveAdmin:
        capabilities.modulePersistence?.updateModuleDetailsForActiveAdmin,
    }),
  };
}

/**
 * Resolve server-owned Course, Module, fields, schedule, and domain result.
 *
 * @param {object} context Request, matched route, and current Admin.
 * @param {object} operations Course-structure operations.
 * @returns {Promise<object>} A direct response or language-neutral result.
 */
export async function resolveModuleManagementRequest(context, operations) {
  const { request, route, adminUser } = context;
  const course = await operations.coursePersistence.findCourseById(
    route.courseId,
  );

  if (course === null) {
    return { response: jsonResponse({ outcome: "course-not-found" }, 404) };
  }

  const module = await operations.modulePersistence.findModuleById(
    route.courseId,
    route.moduleId,
  );

  if (module === null) {
    return { response: jsonResponse({ outcome: "module-not-found" }, 404) };
  }

  if (request.method === "DELETE") {
    return resolveModuleDeletion({ adminUser, course, module, route }, operations);
  }

  const body = await readJsonObject(request);
  const result = route.kind === "module"
    ? await operations.updateModuleDetails({
        adminUser,
        course,
        module,
        title: body.title,
        description: body.description,
        instructions: body.instructions,
      })
    : await operations.rescheduleModule({
        adminUser,
        course,
        module,
        startsAtLocal: body.startsAtLocal,
        startsAtOccurrence: body.startsAtOccurrence,
        endsAtLocal: body.endsAtLocal,
        endsAtOccurrence: body.endsAtOccurrence,
      });

  return { result };
}

/** @returns {Promise<object>} One permanent Module deletion result. */
async function resolveModuleDeletion(context, operations) {
  const selectionContexts =
    await operations.modulePersistence.listSelectionContextsByModuleId(
      context.route.courseId,
      context.route.moduleId,
    );
  const result = await operations.deleteModule({
    adminUser: context.adminUser,
    course: context.course,
    module: context.module,
    selectionContexts,
  });

  return { result };
}

/**
 * Handle one Module edit with shared actor/Course stale-state resolution.
 *
 * @param {object} context Request, route, and current Admin.
 * @param {object} operations Course-structure operations.
 * @param {Function} resolveCurrentStateRefusal Shared stale resolver.
 * @returns {Promise<Response>} Exact Module management response.
 */
export async function handleModuleManagementRequest(
  context,
  operations,
  resolveCurrentStateRefusal,
) {
  const resolution = await resolveModuleManagementRequest(context, operations);

  if (resolution.response !== undefined) return resolution.response;

  const staleResponse = await resolveCurrentStateRefusal(
    resolution.result,
    { request: context.request, courseId: context.route.courseId },
    operations,
  );

  return staleResponse ?? moduleManagementResultResponse(
    resolution,
    operations.now(),
  );
}

/**
 * Map one non-actor/non-Course Module management result to exact HTTP.
 *
 * @param {object} resolution Module result.
 * @param {string} currentInstant Definite response instant.
 * @returns {Response} Narrow success or refusal response.
 */
export function moduleManagementResultResponse({ result }, currentInstant) {
  if (result.outcome === "deleted") {
    return jsonResponse({
      outcome: "deleted",
      module: toModuleResponse(result.module, currentInstant),
    }, 200);
  }

  if (new Set(["rescheduled", "updated"]).has(result.outcome)) {
    return jsonResponse(toModuleResponse(result.module, currentInstant), 200);
  }

  const fieldOutcomes = new Set([
    "invalid-title",
    "invalid-description",
    "invalid-instructions",
    "invalid-starts-at",
    "nonexistent-starts-at",
    "start-not-in-future",
    "invalid-ends-at",
    "nonexistent-ends-at",
    "end-not-after-start",
    "invalid-course-timezone",
    "schedule-disambiguation-required",
    "module-schedule-invalid",
  ]);

  if (fieldOutcomes.has(result.outcome)) return jsonResponse(result, 422);
  return jsonResponse(
    result,
    result.outcome === "module-not-found" ? 404 : 409,
  );
}

/** @returns {Response} Exact non-stale Module creation response. */
export function moduleCreationResultResponse(result, currentInstant) {
  if (result.outcome === "created") {
    return jsonResponse(toModuleResponse(result.module, currentInstant), 201);
  }

  return jsonResponse(
    result,
    result.outcome === "course-timezone-changed" ? 409 : 422,
  );
}
