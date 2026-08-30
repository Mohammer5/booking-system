import {
  adminCollectionConfigurations,
  parseAdminCollectionQuery,
} from "../admin-collections/index.js";
import {
  jsonResponse,
  toCourseDetailResponse,
  toCourseResponse,
  toGroupResponse,
  toModuleResponse,
} from "./courseHttpContract.js";

/** @returns {Promise<Response>} One freshly authorized Course read. */
export function handleCourseReadRequest(
  context,
  operations,
  staleAdminResponse,
) {
  const handlers = {
    courses: handleCourseListRequest,
    course: handleCourseDetailRequest,
    groups: handleNestedCollectionRequest,
    group: handleGroupDetailRequest,
    modules: handleNestedCollectionRequest,
    module: handleModuleDetailRequest,
  };

  return handlers[context.route.kind](context, operations, staleAdminResponse);
}

/** @returns {Promise<Response>} One validated Course collection. */
async function handleCourseListRequest(context, operations, staleResponse) {
  const parsed = parseAdminCollectionQuery(
    new URL(context.request.url).searchParams,
    adminCollectionConfigurations.courses,
  );

  if (parsed.outcome !== "valid") {
    return jsonResponse({ outcome: parsed.outcome }, 400);
  }

  const result = await operations.coursePersistence.listCoursePage(
    context.adminUser.id,
    parsed.query,
  );

  if (result.outcome === "admin-not-active") {
    return staleResponse(context.request, operations);
  }

  return jsonResponse({
    courses: result.items.map(toCourseResponse),
    pagination: result.pagination,
  }, 200);
}

/** @returns {Promise<Response>} One focused Course detail. */
async function handleCourseDetailRequest(context, operations, staleResponse) {
  const result = await operations.coursePersistence.findCourseDetailForAdmin(
    context.adminUser.id,
    context.route.courseId,
    Date.parse(operations.now()),
  );

  if (result.outcome === "admin-not-active") {
    return staleResponse(context.request, operations);
  }

  if (result.outcome === "course-not-found") {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  return jsonResponse(
    toCourseDetailResponse(result.detail.course, result.detail),
    200,
  );
}

/** @returns {Promise<Response>} One validated Group or Module collection. */
async function handleNestedCollectionRequest(
  context,
  operations,
  staleResponse,
) {
  const isGroup = context.route.kind === "groups";
  const parsed = parseAdminCollectionQuery(
    new URL(context.request.url).searchParams,
    adminCollectionConfigurations[isGroup ? "groups" : "modules"],
  );

  if (parsed.outcome !== "valid") {
    return jsonResponse({ outcome: parsed.outcome }, 400);
  }

  const persistence = isGroup
    ? operations.groupPersistence
    : operations.modulePersistence;
  const method = isGroup ? "listGroupPage" : "listModulePage";
  const result = await persistence[method](
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

  const items = isGroup
    ? result.items.map(toGroupResponse)
    : result.items.map((module) => toModuleResponse(module, operations.now()));

  return jsonResponse({
    course: toCourseResponse(result.context),
    [isGroup ? "groups" : "modules"]: items,
    pagination: result.pagination,
  }, 200);
}

/** @returns {Promise<Response>} One same-Course Group read. */
async function handleGroupDetailRequest(context, operations) {
  const [course, group] = await Promise.all([
    operations.coursePersistence.findCourseById(context.route.courseId),
    operations.groupPersistence.findGroupById(
      context.route.courseId,
      context.route.groupId,
    ),
  ]);

  if (course === null) return jsonResponse({ outcome: "course-not-found" }, 404);
  if (group === null) return jsonResponse({ outcome: "group-not-found" }, 404);

  return jsonResponse({
    course: toCourseResponse(course),
    group: toGroupResponse(group),
  }, 200);
}

/** @returns {Promise<Response>} One same-Course Module read. */
async function handleModuleDetailRequest(context, operations) {
  const [course, module] = await Promise.all([
    operations.coursePersistence.findCourseById(context.route.courseId),
    operations.modulePersistence.findModuleById(
      context.route.courseId,
      context.route.moduleId,
    ),
  ]);

  if (course === null) return jsonResponse({ outcome: "course-not-found" }, 404);
  if (module === null) return jsonResponse({ outcome: "module-not-found" }, 404);

  return jsonResponse({
    course: toCourseResponse(course),
    module: toModuleResponse(module, operations.now()),
  }, 200);
}
