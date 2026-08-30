import {
  literalLikePattern,
  pageBindings,
  readAdminCollection,
} from "../admin-collections/index.js";

/** @returns {object} Guarded Participant collection persistence. */
export function createParticipantCollectionPersistence(database) {
  return {
    listParticipantPage: (adminUserId, query) =>
      listParticipantPage(database, adminUserId, query),
  };
}

/** @returns {Promise<object>} One guarded, filtered Participant page. */
function listParticipantPage(database, adminUserId, query) {
  const clauses = [];
  const bindings = [];

  if (query.q !== undefined) {
    const pattern = literalLikePattern(query.q);

    clauses.push(`(
      lower(p.name) like lower(?) escape '\\'
      or lower(p.email) like lower(?) escape '\\'
    )`);
    bindings.push(pattern, pattern);
  }

  if (query.filters.state !== undefined) {
    clauses.push("p.state = ?");
    bindings.push(query.filters.state);
  }

  const where = clauses.length === 0 ? "" : `where ${clauses.join(" and ")}`;
  const orderBy = participantOrderBy(query);

  return readAdminCollection(database, {
    adminUserId,
    countStatement: database
      .prepare(`select count(*) as total_items from participants p ${where}`)
      .bind(...bindings),
    pageStatement: database
      .prepare(
        `select p.id, p.external_principal_id, p.name, p.email, p.state
           from participants p ${where}
          order by ${orderBy}
          limit ? offset ?`,
      )
      .bind(...bindings, ...pageBindings(query)),
    query,
    mapItem: mapParticipant,
  });
}

/** @returns {string} Static Participant ordering and identity tie-break. */
function participantOrderBy(query) {
  const field = {
    name: "p.name collate nocase",
    email: "p.email collate nocase",
    state: "p.state",
  }[query.sortField];
  const direction = { asc: "asc", desc: "desc" }[query.sortDirection];

  return `${field} ${direction}, p.id asc`;
}

/** @returns {object} One Participant domain representation. */
function mapParticipant(row) {
  return {
    id: row.id,
    externalPrincipalId: row.external_principal_id,
    name: row.name,
    email: row.email,
    state: row.state,
  };
}
