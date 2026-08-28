/**
 * Validate and retain one complete booking-system Participant profile input.
 *
 * @param {object} input Supplied Participant name and email.
 * @returns {object} Valid retained profile or one field outcome.
 */
export function getParticipantProfileInput({ name, email }) {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { outcome: "invalid-name" };
  }

  const retainedEmail = retainValidParticipantEmail(email);

  return retainedEmail === null
    ? { outcome: "invalid-email" }
    : {
        outcome: "valid-profile",
        profile: {
          name,
          email: retainedEmail,
          normalizedEmail: retainedEmail.toLowerCase(),
        },
      };
}

/** @returns {string | null} Retained complete email or an invalid result. */
function retainValidParticipantEmail(email) {
  if (typeof email !== "string") {
    return null;
  }

  const retainedEmail = email.trim();
  const completeEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

  return completeEmailPattern.test(retainedEmail) ? retainedEmail : null;
}
