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
    updateActiveParticipantProfile: (input) =>
      updateActiveParticipantProfile(database, input),
    updateParticipantProfileAsActiveAdmin: (input) =>
      updateParticipantProfileAsActiveAdmin(database, input),
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
 * Update only profile columns while the self-editing Participant stays Active.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Target identity and validated profile.
 * @returns {Promise<object>} Updated or current-state refusal outcome.
 */
async function updateActiveParticipantProfile(database, input) {
  let result;

  try {
    result = await database
      .prepare(
        `update participants
            set name = ?, email = ?, normalized_email = ?
          where id = ? and state = 'active'`,
      )
      .bind(
        input.profile.name,
        input.profile.email,
        input.profile.normalizedEmail,
        input.participantId,
      )
      .run();
  } catch (error) {
    return classifyProfileConstraint(
      database,
      {
        participantId: input.participantId,
        normalizedEmail: input.profile.normalizedEmail,
        error,
      },
    );
  }

  if (result.meta.changes === 1) {
    return { outcome: "updated" };
  }

  const participant = await findParticipantById(database, input.participantId);

  return {
    outcome:
      participant?.state === "active"
        ? "profile-not-updated"
        : "participant-not-active",
  };
}

/**
 * Update only profile columns while the Admin and target remain eligible.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Actor, target, and validated profile.
 * @returns {Promise<object>} Updated or current-state refusal outcome.
 */
async function updateParticipantProfileAsActiveAdmin(database, input) {
  let result;

  try {
    result = await database
      .prepare(
        `update participants
            set name = ?, email = ?, normalized_email = ?
          where id = ? and state in ('active', 'disabled')
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )`,
      )
      .bind(
        input.profile.name,
        input.profile.email,
        input.profile.normalizedEmail,
        input.participantId,
        input.adminUserId,
      )
      .run();
  } catch (error) {
    return classifyProfileConstraint(
      database,
      {
        participantId: input.participantId,
        normalizedEmail: input.profile.normalizedEmail,
        error,
      },
    );
  }

  if (result.meta.changes === 1) {
    return { outcome: "updated" };
  }

  const [adminUser, participant] = await Promise.all([
    database
      .prepare("select state from admin_users where id = ?")
      .bind(input.adminUserId)
      .first(),
    findParticipantById(database, input.participantId),
  ]);

  if (adminUser?.state !== "active") {
    return { outcome: "admin-not-active" };
  }

  return {
    outcome:
      participant === null
        ? "participant-not-editable"
        : "profile-not-updated",
  };
}

/** @returns {Promise<object>} Known email conflict or rethrown technical error. */
async function classifyProfileConstraint(
  database,
  { participantId, normalizedEmail, error },
) {
  const conflict = await database
    .prepare(
      `select id from participants
        where normalized_email = ? and id <> ?`,
    )
    .bind(normalizedEmail, participantId)
    .first();

  if (conflict !== null) {
    return { outcome: "email-already-exists" };
  }

  throw error;
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
