import { resolveFutureModuleSchedule } from "./resolveFutureModuleSchedule.js";
import { validateModuleText } from "./validateModuleText.js";

/**
 * Create the future Module creation operation from time and persistence capabilities.
 *
 * @param {object} capabilities Module creation capabilities.
 * @param {() => string} capabilities.createModuleId Create a stable Module identity.
 * @param {(input: {adminUserId: string, courseTimezone: string, module: object}) => Promise<string>} capabilities.createModuleForActiveAdmin Persist only for a current Active Admin and unchanged Course.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @returns {(input: object) => Promise<object>} The Module creation operation.
 */
export function createCreateModule({
  createModuleId,
  createModuleForActiveAdmin,
  now,
}) {
  return async function createModule(input) {
    const inputFailure = validateModuleInput(input);

    if (inputFailure !== null) {
      return inputFailure;
    }

    const schedule = resolveFutureModuleSchedule(input, now());

    if (schedule.outcome !== "resolved") {
      return schedule;
    }

    const module = createModuleData(input, schedule, createModuleId());
    const persistenceOutcome = await createModuleForActiveAdmin({
      adminUserId: input.adminUser.id,
      courseTimezone: input.course.timezone,
      module,
    });

    return persistenceOutcome === "created"
      ? { outcome: "created", module }
      : { outcome: persistenceOutcome };
  };
}

/**
 * Validate actor, Course, and descriptive input before resolving time.
 *
 * @param {object} input Candidate Module input.
 * @returns {object | null} Refusal outcome or null.
 */
function validateModuleInput(input) {
  if (input.adminUser?.state !== "active") {
    return { outcome: "admin-not-active" };
  }

  if (input.course?.state !== "active") {
    return { outcome: "course-not-active" };
  }

  const invalidTextOutcome = validateModuleText(input, {
    allowOmittedOptionals: true,
  });

  return invalidTextOutcome === null ? null : { outcome: invalidTextOutcome };
}

/**
 * Create the minimal Scheduled Module plain data.
 *
 * @param {object} input Valid Module input.
 * @param {object} schedule Resolved definite interval.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} Scheduled Module data.
 */
function createModuleData(input, schedule, moduleId) {
  return {
    id: moduleId,
    courseId: input.course.id,
    title: input.title,
    description: input.description ?? null,
    instructions: input.instructions ?? null,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    state: "scheduled",
  };
}
