/**
 * Execute one atomic Active-Admin-guarded count and page read.
 *
 * @param {object} database Application D1 binding.
 * @param {object} input Prepared resource statements and mapping.
 * @returns {Promise<object>} Listed data, actor refusal, or missing parent.
 */
export async function readAdminCollection(database, input) {
  const statements = [activeAdminStatement(database, input.adminUserId)];

  if (input.contextStatement !== undefined) {
    statements.push(input.contextStatement);
  }

  statements.push(input.countStatement, input.pageStatement);
  const results = await database.batch(statements);

  if (results[0].results.length === 0) {
    return { outcome: "admin-not-active" };
  }

  const offset = input.contextStatement === undefined ? 1 : 2;
  const contextResult = input.contextStatement === undefined
    ? undefined
    : results[1];

  if (contextResult !== undefined && contextResult.results.length === 0) {
    return { outcome: "parent-not-found" };
  }

  const totalItems = Number(results[offset].results[0].total_items);

  return {
    outcome: "listed",
    context: contextResult === undefined
      ? undefined
      : input.mapContext(contextResult.results[0]),
    items: results[offset + 1].results.map(input.mapItem),
    pagination: createPagination(input.query, totalItems),
  };
}

/** @returns {object} One fresh Active Admin statement for a D1 batch. */
function activeAdminStatement(database, adminUserId) {
  return database
    .prepare("select id from admin_users where id = ? and state = 'active'")
    .bind(adminUserId);
}

/** @returns {object} Shared one-based authoritative metadata. */
export function createPagination(query, totalItems) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / query.pageSize),
  };
}

/** @returns {Array<number>} Bound limit and offset values. */
export function pageBindings(query) {
  return [query.pageSize, (query.page - 1) * query.pageSize];
}

/**
 * Escape literal search text for SQLite LIKE with a backslash escape clause.
 *
 * @param {string} value Applied free-text search.
 * @returns {string} Literal contains pattern.
 */
export function literalLikePattern(value) {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%")
    .replaceAll("_", "\\_")}%`;
}
