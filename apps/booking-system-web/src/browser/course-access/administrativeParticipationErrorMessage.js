/**
 * Map one Admin participation read failure to safe localized copy.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Unavailable or technical-error message.
 */
export function administrativeParticipationErrorMessage(error, translate) {
  const unavailable = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "participation-unavailable",
  ]);

  return translate(
    unavailable.has(error?.outcome)
      ? "courseAccess.adminParticipation.unavailable"
      : "courseAccess.adminParticipation.technicalError",
  );
}
