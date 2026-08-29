/**
 * Create narrow D1 capabilities for Admin Invite administration.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Admin Invite persistence capabilities.
 */
export function createAdminInvitePersistence(database) {
  return {
    createActiveAdminInvite: (invite) => createActiveInvite(database, invite),
    findAdminInviteById: (inviteId) => findInviteById(database, inviteId),
    listAdminInvites: (adminUserId) => listInvites(database, adminUserId),
    revokeActiveAdminInvite: (input) => revokeActiveInvite(database, input),
  };
}

/** @returns {Promise<string>} Guarded Active Invite creation outcome. */
async function createActiveInvite(database, invite) {
  const result = await database.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     select ?, ?, a.id, ?, 'active'
       from admin_users a
      where a.id = ? and a.state = 'active'`,
  ).bind(
    invite.id,
    invite.tokenDigest,
    invite.createdAt,
    invite.createdByAdminUserId,
  ).run();

  return result.meta.changes === 1 ? "created" : "admin-not-active";
}

/** @returns {Promise<Array<object> | string>} Fresh guarded non-secret list. */
async function listInvites(database, adminUserId) {
  const [actorResult, inviteResult] = await database.batch([
    database.prepare(
      "select id from admin_users where id = ? and state = 'active'",
    ).bind(adminUserId),
    database.prepare(
      `select id, created_at, state
         from admin_invites
        order by created_at desc, id asc`,
    ),
  ]);

  return actorResult.results.length === 0
    ? "admin-not-active"
    : inviteResult.results.map(mapInvite);
}

/** @returns {Promise<string>} Guarded terminal Revoke outcome. */
async function revokeActiveInvite(database, input) {
  const result = await database.prepare(
    `update admin_invites
        set state = 'revoked'
      where id = ? and state = 'active'
        and exists (
          select 1 from admin_users a
           where a.id = ? and a.state = 'active'
        )`,
  ).bind(input.inviteId, input.adminUserId).run();

  if (result.meta.changes === 1) return "revoked";
  return classifyRevokeRefusal(database, input);
}

/** @returns {Promise<string>} Exact stale actor or terminal Invite refusal. */
async function classifyRevokeRefusal(database, input) {
  const [adminUser, invite] = await Promise.all([
    database.prepare("select state from admin_users where id = ?")
      .bind(input.adminUserId).first(),
    findInviteById(database, input.inviteId),
  ]);

  if (adminUser?.state !== "active") return "admin-not-active";
  return invite === null
    ? "admin-invite-not-found"
    : "admin-invite-not-active";
}

/** @returns {Promise<object | null>} One non-secret Admin Invite. */
async function findInviteById(database, inviteId) {
  const row = await database.prepare(
    `select id, created_at, state
       from admin_invites where id = ?`,
  ).bind(inviteId).first();

  return row === null ? null : mapInvite(row);
}

/** @returns {object} Plain non-secret Admin Invite data. */
function mapInvite(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    state: row.state,
  };
}
