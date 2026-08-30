const allowedPageSizes = new Set([10, 25, 50]);
const allowedDirections = new Set(["asc", "desc"]);

/** @returns {object} One immutable resource-owned collection configuration. */
export function createAdminCollectionConfiguration(input) {
  const [defaultSortField, defaultSortDirection] = input.defaultSort.split(".");

  return Object.freeze({
    ...input,
    defaultSortField,
    defaultSortDirection,
    filters: Object.freeze(input.filters ?? {}),
    sortFields: Object.freeze(input.sortFields),
  });
}

/**
 * Normalize and canonically serialize one collection URL.
 *
 * Invalid or repeated owned parameters fall back independently, while unknown
 * parameters are removed so they never reach the Worker.
 *
 * @returns {object} Normalized state, canonical parameters, and repair flag.
 */
export function normalizeAdminCollectionSearch(searchParams, configuration) {
  const pageSize = allowedPageSizes.has(Number(singleValue(searchParams, "pageSize")))
    ? Number(singleValue(searchParams, "pageSize"))
    : 25;
  const pageValue = singleValue(searchParams, "page");
  const page = pageValue !== undefined && /^\d+$/.test(pageValue) &&
    Number.isSafeInteger(Number(pageValue)) && Number(pageValue) > 0
    ? Number(pageValue)
    : 1;
  const sort = normalizeSort(singleValue(searchParams, "sort"), configuration);
  const filters = Object.fromEntries(
    Object.entries(configuration.filters).map(([name, values]) => {
      const value = singleValue(searchParams, name);

      return [name, values.includes(value) ? value : undefined];
    }),
  );
  const rawSearch = configuration.searchable
    ? singleValue(searchParams, "q")?.trim()
    : undefined;
  const state = {
    page,
    pageSize,
    sortField: sort.field,
    sortDirection: sort.direction,
    q: rawSearch === "" ? undefined : rawSearch,
    filters,
  };
  const canonicalSearchParams = toAdminCollectionSearchParams(
    state,
    configuration,
  );

  return {
    state,
    searchParams: canonicalSearchParams,
    needsRepair: canonicalSearchParams.toString() !== searchParams.toString(),
  };
}

/** @returns {URLSearchParams} Canonical parameters with defaults omitted. */
export function toAdminCollectionSearchParams(state, configuration) {
  const searchParams = new URLSearchParams();

  if (state.q !== undefined && configuration.searchable) {
    searchParams.set("q", state.q);
  }

  for (const name of Object.keys(configuration.filters)) {
    if (state.filters[name] !== undefined) {
      searchParams.set(name, state.filters[name]);
    }
  }

  if (
    state.sortField !== configuration.defaultSortField ||
    state.sortDirection !== configuration.defaultSortDirection
  ) {
    searchParams.set("sort", `${state.sortField}.${state.sortDirection}`);
  }

  if (state.pageSize !== 25) searchParams.set("pageSize", String(state.pageSize));
  if (state.page !== 1) searchParams.set("page", String(state.page));
  return searchParams;
}

/** @returns {string} Complete normalized query string sent to the Worker. */
export function toAdminCollectionRequestSearch(state) {
  const searchParams = new URLSearchParams({
    page: String(state.page),
    pageSize: String(state.pageSize),
    sort: `${state.sortField}.${state.sortDirection}`,
  });

  if (state.q !== undefined) searchParams.set("q", state.q);
  for (const [name, value] of Object.entries(state.filters)) {
    if (value !== undefined) searchParams.set(name, value);
  }

  return searchParams.toString();
}

/** @returns {object} Apply one state change, resetting page unless page-only. */
export function changeAdminCollectionState(state, change) {
  const next = {
    ...state,
    ...change,
    filters: change.filters === undefined
      ? state.filters
      : { ...state.filters, ...change.filters },
  };

  return Object.keys(change).length === 1 && change.page !== undefined
    ? next
    : { ...next, page: 1 };
}

/** @returns {object} Clear search/filters while retaining page size and sort. */
export function resetAdminCollectionFilters(state) {
  return {
    ...state,
    page: 1,
    q: undefined,
    filters: Object.fromEntries(
      Object.keys(state.filters).map((name) => [name, undefined]),
    ),
  };
}

/** @returns {boolean} Whether search or a resource filter is applied. */
export function hasAdminCollectionFilters(state) {
  return state.q !== undefined || Object.values(state.filters).some(
    (value) => value !== undefined,
  );
}

/** @returns {string | undefined} One non-repeated raw value. */
function singleValue(searchParams, name) {
  const values = searchParams.getAll(name);

  return values.length === 1 ? values[0] : undefined;
}

/** @returns {object} One allowlisted sort or its resource default. */
function normalizeSort(value, configuration) {
  if (value !== undefined) {
    const separator = value.lastIndexOf(".");
    const field = value.slice(0, separator);
    const direction = value.slice(separator + 1);

    if (
      configuration.sortFields.includes(field) &&
      allowedDirections.has(direction)
    ) {
      return { field, direction };
    }
  }

  return {
    field: configuration.defaultSortField,
    direction: configuration.defaultSortDirection,
  };
}
