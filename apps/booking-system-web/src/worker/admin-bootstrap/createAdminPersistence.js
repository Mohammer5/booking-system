/**
 * Create the narrow D1 capabilities owned by first-Admin bootstrap.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Booking-facing persistence capabilities.
 */
export function createAdminPersistence(database) {
  return {
    async hasAdminUserEverBeenCreated() {
      const history = await database
        .prepare(
          "select singleton from admin_bootstrap_history where singleton = 1",
        )
        .first();

      return history !== null;
    },

    async findAdminUserByExternalPrincipalId(externalPrincipalId) {
      const row = await database
        .prepare(
          `select id, external_principal_id, name, state, authority
             from admin_users
            where external_principal_id = ?`,
        )
        .bind(externalPrincipalId)
        .first();

      return row === null ? null : mapAdminUser(row);
    },

    async claimFirstAdmin(candidateAdminUser) {
      try {
        await database.batch([
          database
            .prepare(
              `insert into admin_users
                 (id, external_principal_id, name, state, authority)
               values (?, ?, ?, ?, ?)`,
            )
            .bind(
              candidateAdminUser.id,
              candidateAdminUser.externalPrincipalId,
              candidateAdminUser.name,
              candidateAdminUser.state,
              candidateAdminUser.authority,
            ),
          database
            .prepare(
              `insert into admin_bootstrap_history
                 (singleton, first_admin_user_id, completed_at)
               values (1, ?, unixepoch())`,
            )
            .bind(candidateAdminUser.id),
        ]);

        return "created";
      } catch (error) {
        const history = await database
          .prepare(
            "select singleton from admin_bootstrap_history where singleton = 1",
          )
          .first();

        if (history !== null) {
          return "bootstrap-unavailable";
        }

        throw error;
      }
    },
  };
}

/**
 * Translate one technical persistence row to booking-domain plain data.
 *
 * @param {object} row A D1 Admin row.
 * @returns {object} The booking-domain Admin User representation.
 */
function mapAdminUser(row) {
  return {
    id: row.id,
    externalPrincipalId: row.external_principal_id,
    name: row.name,
    state: row.state,
    authority: row.authority,
  };
}
