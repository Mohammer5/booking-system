/**
 * Create terminal pre-end Module cancellation with one injected instant.
 *
 * @param {object} capabilities Module cancellation capabilities.
 * @returns {(input: object) => Promise<object>} Module cancellation operation.
 */
export function createCancelModule({ now, cancelScheduledModule }) {
  return async function cancelModule(input) {
    const refusal = validateCancellationInput(input);

    if (refusal !== null) return { outcome: refusal };

    const nowEpoch = Date.parse(now());

    if (nowEpoch >= Date.parse(input.module.endsAt)) {
      return { outcome: "module-cancellation-deadline-reached" };
    }

    const persistenceOutcome = await cancelScheduledModule({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      moduleId: input.module.id,
      nowEpoch,
    });

    return persistenceOutcome === "cancelled"
      ? {
          outcome: "cancelled",
          module: { ...input.module, state: "cancelled" },
        }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First Module cancellation refusal or null. */
function validateCancellationInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (
    input.module?.courseId !== input.course.id ||
    !Number.isFinite(Date.parse(input.module?.startsAt)) ||
    !Number.isFinite(Date.parse(input.module?.endsAt))
  ) {
    return "module-not-cancellable";
  }

  return input.module.state === "scheduled" ? null : "module-not-scheduled";
}
