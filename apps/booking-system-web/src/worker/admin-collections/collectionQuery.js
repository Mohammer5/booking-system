const pageSizes = new Set([10, 25, 50]);
const directions = new Set(["asc", "desc"]);

export const adminCollectionConfigurations = Object.freeze({
  courses: collectionConfiguration({
    filters: { state: ["active", "archived"] },
    searchable: true,
    sortFields: ["name", "state", "timezone"],
    defaultSort: "name.asc",
  }),
  participants: collectionConfiguration({
    filters: { state: ["active", "disabled"] },
    searchable: true,
    sortFields: ["name", "email", "state"],
    defaultSort: "name.asc",
  }),
  adminUsers: collectionConfiguration({
    filters: {
      state: ["active", "disabled"],
      authority: ["admin", "super-admin"],
    },
    searchable: true,
    sortFields: ["name", "state", "authority"],
    defaultSort: "name.asc",
  }),
  invites: collectionConfiguration({
    filters: { state: ["active", "claimed", "revoked"] },
    searchable: false,
    sortFields: ["createdAt", "state"],
    defaultSort: "createdAt.desc",
  }),
  assignments: collectionConfiguration({
    filters: {
      participantState: ["active", "disabled"],
      assignmentState: ["active", "revoked"],
    },
    searchable: true,
    sortFields: [
      "name",
      "email",
      "participantState",
      "assignmentState",
    ],
    defaultSort: "name.asc",
  }),
  groups: collectionConfiguration({
    filters: { state: ["active", "archived"] },
    searchable: true,
    sortFields: ["name", "state"],
    defaultSort: "name.asc",
  }),
  modules: collectionConfiguration({
    filters: { state: ["scheduled", "cancelled"] },
    searchable: true,
    sortFields: ["startsAt", "title", "state"],
    defaultSort: "startsAt.asc",
  }),
});

/**
 * Parse one strict Admin collection query without retaining raw syntax.
 *
 * @param {URLSearchParams} searchParams Incoming query parameters.
 * @param {object} configuration Resource-specific allowlists and defaults.
 * @returns {object} Valid normalized state or one invalid outcome.
 */
export function parseAdminCollectionQuery(searchParams, configuration) {
  const allowedKeys = new Set([
    "page",
    "pageSize",
    "sort",
    ...(configuration.searchable ? ["q"] : []),
    ...Object.keys(configuration.filters),
  ]);

  if (hasUnknownOrRepeatedParameter(searchParams, allowedKeys)) {
    return { outcome: "invalid-list-query" };
  }

  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const page = parsePage(searchParams.get("page"), pageSize);
  const sort = parseSort(searchParams.get("sort"), configuration);
  const filters = parseFilters(searchParams, configuration.filters);

  if (page === null || pageSize === null || sort === null || filters === null) {
    return { outcome: "invalid-list-query" };
  }

  return {
    outcome: "valid",
    query: {
      page,
      pageSize,
      sortField: sort.field,
      sortDirection: sort.direction,
      q: configuration.searchable
        ? normalizeSearch(searchParams.get("q"))
        : undefined,
      filters,
    },
  };
}

/** @returns {object} Frozen normalized configuration. */
function collectionConfiguration(input) {
  const [defaultField, defaultDirection] = input.defaultSort.split(".");

  return Object.freeze({
    ...input,
    filters: Object.freeze(input.filters),
    sortFields: Object.freeze(input.sortFields),
    defaultField,
    defaultDirection,
  });
}

/** @returns {boolean} Whether keys or multiplicity violate the contract. */
function hasUnknownOrRepeatedParameter(searchParams, allowedKeys) {
  const seen = new Set();

  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key) || seen.has(key)) return true;
    seen.add(key);
  }

  return false;
}

/** @returns {number | null} One safe one-based page. */
function parsePage(value, pageSize) {
  if (pageSize === null) return null;
  if (value === null) return 1;
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);

  return Number.isSafeInteger(page) && page > 0 &&
    Number.isSafeInteger((page - 1) * pageSize)
    ? page
    : null;
}

/** @returns {number | null} An allowlisted page size. */
function parsePageSize(value) {
  if (value === null) return 25;
  const parsed = Number(value);

  return /^\d+$/.test(value) && pageSizes.has(parsed) ? parsed : null;
}

/** @returns {object | null} A normalized static sort selection. */
function parseSort(value, configuration) {
  const field = value === null
    ? configuration.defaultField
    : value.slice(0, value.lastIndexOf("."));
  const direction = value === null
    ? configuration.defaultDirection
    : value.slice(value.lastIndexOf(".") + 1);

  return configuration.sortFields.includes(field) && directions.has(direction)
    ? { field, direction }
    : null;
}

/** @returns {object | null} Normalized allowlisted filter values. */
function parseFilters(searchParams, filterConfiguration) {
  const filters = {};

  for (const [key, values] of Object.entries(filterConfiguration)) {
    const value = searchParams.get(key);

    if (value !== null && !values.includes(value)) return null;
    filters[key] = value ?? undefined;
  }

  return filters;
}

/** @returns {string | undefined} Trimmed applied search. */
function normalizeSearch(value) {
  const normalized = value?.trim() ?? "";

  return normalized.length === 0 ? undefined : normalized;
}
