/**
 * Associate an authoritative Module field refusal with its input.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {object} form React Hook Form state.
 * @param {(key: string) => string} translate Translation function.
 * @returns {void}
 */
export function applyModuleFieldOutcome(error, form, translate) {
  const fieldDetails = moduleFieldDetails(error.outcome);

  if (fieldDetails !== null) {
    form.setError(fieldDetails.field, {
      type: "server",
      message: translate(fieldDetails.key),
    });
    form.setFocus(fieldDetails.field);
  }
}

/**
 * Identify Module outcomes rendered at a field.
 *
 * @param {string | undefined} outcome Request outcome.
 * @returns {boolean} Whether the outcome belongs to a field.
 */
export function isModuleFieldOutcome(outcome) {
  return moduleFieldDetails(outcome) !== null;
}

/**
 * Map one form-level Module failure to German presentation.
 *
 * @param {Error} error Request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized message.
 */
export function moduleErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
    "course-timezone-changed",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.status.unavailable")
    : translate("courseStructure.status.technicalError");
}

/**
 * Resolve one Module outcome to a field and translation key.
 *
 * @param {string | undefined} outcome Request outcome.
 * @returns {object | null} Field details or null.
 */
function moduleFieldDetails(outcome) {
  const detailsByOutcome = {
    "invalid-title": ["title", "titleRequired"],
    "invalid-description": ["description", "descriptionInvalid"],
    "invalid-instructions": ["instructions", "instructionsInvalid"],
    "invalid-starts-at": ["startsAtLocal", "startsAtInvalid"],
    "nonexistent-starts-at": ["startsAtLocal", "startsAtNonexistent"],
    "start-not-in-future": ["startsAtLocal", "startsAtFuture"],
    "invalid-ends-at": ["endsAtLocal", "endsAtInvalid"],
    "nonexistent-ends-at": ["endsAtLocal", "endsAtNonexistent"],
    "end-not-after-start": ["endsAtLocal", "endsAtAfterStart"],
  };
  const details = detailsByOutcome[outcome];

  return details === undefined
    ? null
    : { field: details[0], key: `courseStructure.module.${details[1]}` };
}
