/**
 * Create narrow D1 capabilities owned by Participant identity and onboarding.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Booking-facing Participant persistence capabilities.
 */
export function createParticipantPersistence(database) {
  return {
    findParticipantById: (participantId) =>
      findParticipantById(database, participantId),
    findParticipantByExternalPrincipalId: (externalPrincipalId) =>
      findParticipantByExternalPrincipalId(database, externalPrincipalId),
    listParticipants: () => listParticipants(database),
    registerParticipant: (candidate) =>
      registerParticipant(database, candidate),
  };
}

/**
 * Resolve one Participant by stable booking identity.
 *
 * @param {object} database The application D1 binding.
 * @param {string} participantId Stable Participant identity.
 * @returns {Promise<object | null>} Current Participant or null.
 */
async function findParticipantById(database, participantId) {
  const row = await database
    .prepare(
      `select id, external_principal_id, name, email, state
         from participants
        where id = ?`,
    )
    .bind(participantId)
    .first();

  return row === null ? null : mapParticipant(row);
}

/**
 * Resolve one Participant for the authenticated external principal.
 *
 * @param {object} database The application D1 binding.
 * @param {string} externalPrincipalId Stable external principal.
 * @returns {Promise<object | null>} Current Participant or null.
 */
async function findParticipantByExternalPrincipalId(
  database,
  externalPrincipalId,
) {
  const row = await database
    .prepare(
      `select id, external_principal_id, name, email, state
         from participants
        where external_principal_id = ?`,
    )
    .bind(externalPrincipalId)
    .first();

  return row === null ? null : mapParticipant(row);
}

/**
 * List every registered Participant in deterministic administration order.
 *
 * @param {object} database The application D1 binding.
 * @returns {Promise<Array<object>>} Ordered Participant data.
 */
async function listParticipants(database) {
  const { results } = await database
    .prepare(
      `select id, external_principal_id, name, email, state
         from participants
        order by name collate nocase, id`,
    )
    .all();

  return results.map(mapParticipant);
}

/**
 * Persist one complete Participant or classify a uniqueness refusal.
 *
 * @param {object} database The application D1 binding.
 * @param {object} candidate Complete Participant persistence candidate.
 * @returns {Promise<string>} Language-neutral registration outcome.
 * @throws {Error} When persistence fails without a known uniqueness conflict.
 */
async function registerParticipant(database, candidate) {
  try {
    await database
      .prepare(
        `insert into participants
           (id, external_principal_id, name, email, normalized_email, state)
         values (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        candidate.id,
        candidate.externalPrincipalId,
        candidate.name,
        candidate.email,
        candidate.normalizedEmail,
        candidate.state,
      )
      .run();

    return "created";
  } catch (error) {
    const principal = await database
      .prepare(
        `select id from participants where external_principal_id = ?`,
      )
      .bind(candidate.externalPrincipalId)
      .first();

    if (principal !== null) {
      return "participant-already-exists";
    }

    const email = await database
      .prepare("select id from participants where normalized_email = ?")
      .bind(candidate.normalizedEmail)
      .first();

    if (email !== null) {
      return "email-already-exists";
    }

    throw error;
  }
}

/**
 * Translate one technical persistence row to booking-domain plain data.
 *
 * @param {object} row A D1 Participant row.
 * @returns {object} The booking-domain Participant representation.
 */
function mapParticipant(row) {
  return {
    id: row.id,
    externalPrincipalId: row.external_principal_id,
    name: row.name,
    email: row.email,
    state: row.state,
  };
}
