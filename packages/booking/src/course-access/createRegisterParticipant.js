/**
 * Create Participant registration from narrow identity and persistence capabilities.
 *
 * @param {object} capabilities Registration capabilities.
 * @param {() => string} capabilities.createParticipantId Create a stable Participant identity.
 * @param {(candidate: object) => Promise<"created" | "participant-already-exists" | "email-already-exists">} capabilities.registerParticipant Persist one Participant atomically.
 * @returns {(input: {externalPrincipalId: string, name: unknown, email: unknown}) => Promise<object>} The registration operation.
 */
export function createRegisterParticipant({
  createParticipantId,
  registerParticipant,
}) {
  return async function registerNewParticipant({
    externalPrincipalId,
    name,
    email,
  }) {
    if (!isValidParticipantName(name)) {
      return { outcome: "invalid-name" };
    }

    const retainedEmail = retainValidParticipantEmail(email);

    if (retainedEmail === null) {
      return { outcome: "invalid-email" };
    }

    const participant = {
      id: createParticipantId(),
      externalPrincipalId,
      name,
      email: retainedEmail,
      state: "active",
    };
    const persistenceOutcome = await registerParticipant({
      ...participant,
      normalizedEmail: normalizeParticipantEmail(retainedEmail),
    });

    if (persistenceOutcome !== "created") {
      return { outcome: persistenceOutcome };
    }

    return { outcome: "created", participant };
  };
}

/**
 * Check the canonical required Participant name without changing profile data.
 *
 * @param {unknown} name Supplied booking-system Participant name.
 * @returns {boolean} Whether the name is nonblank after validation trimming.
 */
function isValidParticipantName(name) {
  return typeof name === "string" && name.trim().length > 0;
}

/**
 * Trim and validate one complete Participant email string.
 *
 * @param {unknown} email Supplied booking-system Participant email.
 * @returns {string | null} The retained trimmed email or null when invalid.
 */
function retainValidParticipantEmail(email) {
  if (typeof email !== "string") {
    return null;
  }

  const retainedEmail = email.trim();
  const completeEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

  return completeEmailPattern.test(retainedEmail) ? retainedEmail : null;
}

/**
 * Derive only the complete-address case-insensitive comparison key.
 *
 * @param {string} email A valid retained Participant email.
 * @returns {string} The uniqueness comparison key.
 */
function normalizeParticipantEmail(email) {
  return email.toLowerCase();
}
