import { resolveFutureModuleSchedule } from "./resolveFutureModuleSchedule.js";

/**
 * Create pre-start Module rescheduling with guarded persistence.
 *
 * @param {object} capabilities Module rescheduling capabilities.
 * @returns {(input: object) => Promise<object>} Module reschedule operation.
 */
export function createRescheduleModule({ now, rescheduleModuleForActiveAdmin }) {
  return async function rescheduleModule(input) {
    const refusal = validateRescheduleInput(input);

    if (refusal !== null) return { outcome: refusal };

    const currentInstant = now();

    if (Date.parse(input.module.startsAt) <= Date.parse(currentInstant)) {
      return { outcome: "module-schedule-locked" };
    }

    const schedule = resolveFutureModuleSchedule(input, currentInstant);

    if (schedule.outcome !== "resolved") return schedule;

    const module = {
      ...input.module,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
    };
    const persistenceOutcome = await rescheduleModuleForActiveAdmin({
      acceptedNowEpoch: Date.parse(currentInstant),
      adminUserId: input.adminUser.id,
      courseTimezone: input.course.timezone,
      expectedEndsAt: input.module.endsAt,
      expectedStartsAt: input.module.startsAt,
      module,
    });

    return persistenceOutcome === "rescheduled"
      ? { outcome: "rescheduled", module }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First rescheduling refusal or null. */
function validateRescheduleInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (
    typeof input.module?.id !== "string" ||
    input.module.courseId !== input.course.id ||
    !Number.isFinite(Date.parse(input.module.startsAt)) ||
    !Number.isFinite(Date.parse(input.module.endsAt))
  ) {
    return "module-not-editable";
  }

  return input.module.state === "scheduled"
    ? null
    : "module-schedule-locked";
}
