/**
 * Create narrow D1 capabilities owned by Participant identity and onboarding.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Booking-facing Participant persistence capabilities.
 */
export function createParticipantPersistence(database) {
  return {
    async findParticipantByExternalPrincipalId(externalPrincipalId) {
      const row = await database
        .prepare(
          `select id, external_principal_id, name, email, state
             from participants
            where external_principal_id = ?`,
        )
        .bind(externalPrincipalId)
        .first();

      return row === null ? null : mapParticipant(row);
    },

    async registerParticipant(candidate) {
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
    },
  };
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
