import {
  pageBindings,
  readAdminCollection,
} from "../admin-collections/index.js";

/**
 * Create narrow D1 capabilities for Admin Invite administration.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Admin Invite persistence capabilities.
 */
export function createAdminInvitePersistence(database) {
  return {
    claimActiveAdminInvite: (input) => claimActiveInvite(database, input),
    createActiveAdminInvite: (invite) => createActiveInvite(database, invite),
    findAdminInviteById: (inviteId) => findInviteById(database, inviteId),
    findRecognizedAdminInviteByDigest: (tokenDigest) =>
      findRecognizedInviteByDigest(database, tokenDigest),
    listAdminInvites: (adminUserId) => listInvites(database, adminUserId),
    listAdminInvitePage: (adminUserId, query) =>
      listInvitePage(database, adminUserId, query),
    revokeActiveAdminInvite: (input) => revokeActiveInvite(database, input),
  };
}

/** @returns {Promise<string>} Atomic Invite claim and ordinary Admin creation. */
async function claimActiveInvite(database, input) {
  try {
    const [inviteResult, adminResult] = await database.batch([
      claimInviteStatement(database, input),
      insertInvitedAdminStatement(database, input.adminUser),
    ]);

    if (inviteResult.meta.changes === 1 && adminResult.meta.changes === 1) {
      return "claimed";
    }

    return classifyClaimRefusal(database, input);
  } catch (error) {
    const refusal = await classifyClaimRefusal(database, input);

    if (refusal !== "admin-invite-not-claimed") return refusal;
    throw error;
  }
}

/** @returns {object} Guarded terminal transition that must win first. */
function claimInviteStatement(database, input) {
  return database.prepare(
    `update admin_invites
        set state = 'claimed'
      where id = ? and state = 'active'
        and not exists (
          select 1 from admin_users
           where external_principal_id = ?
        )`,
  ).bind(input.inviteId, input.adminUser.externalPrincipalId);
}

/** @returns {object} Candidate insert coupled to the preceding update count. */
function insertInvitedAdminStatement(database, adminUser) {
  return database.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     select ?, ?, ?, ?, ? where changes() = 1`,
  ).bind(
    adminUser.id,
    adminUser.externalPrincipalId,
    adminUser.name,
    adminUser.state,
    adminUser.authority,
  );
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

/** @returns {Promise<object>} One guarded, filtered non-secret Invite page. */
function listInvitePage(database, adminUserId, query) {
  const bindings = [];
  const where = query.filters.state === undefined ? "" : "where i.state = ?";

  if (query.filters.state !== undefined) bindings.push(query.filters.state);
  const orderBy = inviteOrderBy(query);

  return readAdminCollection(database, {
    adminUserId,
    countStatement: database
      .prepare(`select count(*) as total_items from admin_invites i ${where}`)
      .bind(...bindings),
    pageStatement: database
      .prepare(
        `select i.id, i.created_at, i.state
           from admin_invites i ${where}
          order by ${orderBy}
          limit ? offset ?`,
      )
      .bind(...bindings, ...pageBindings(query)),
    query,
    mapItem: mapInvite,
  });
}

/** @returns {string} Static Invite ordering and identity tie-break. */
function inviteOrderBy(query) {
  const field = {
    createdAt: "i.created_at",
    state: "i.state",
  }[query.sortField];
  const direction = { asc: "asc", desc: "desc" }[query.sortDirection];

  return `${field} ${direction}, i.id asc`;
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

/** @returns {Promise<object | null>} One non-secret Invite resolved by digest. */
async function findRecognizedInviteByDigest(database, tokenDigest) {
  const row = await database.prepare(
    `select id, created_at, state
       from admin_invites where token_digest = ?`,
  ).bind(tokenDigest).first();

  return row === null ? null : mapInvite(row);
}

/** @returns {Promise<string>} Exact principal, Invite, or technical refusal. */
async function classifyClaimRefusal(database, input) {
  const [adminUser, invite] = await Promise.all([
    database.prepare(
      "select id from admin_users where external_principal_id = ?",
    ).bind(input.adminUser.externalPrincipalId).first(),
    findInviteById(database, input.inviteId),
  ]);

  if (adminUser !== null) return "admin-user-already-exists";
  return invite?.state !== "active"
    ? "invite-unavailable"
    : "admin-invite-not-claimed";
}

/** @returns {object} Plain non-secret Admin Invite data. */
function mapInvite(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    state: row.state,
  };
}
