import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";

import {
  changeAdminCollectionState,
  hasAdminCollectionFilters,
  normalizeAdminCollectionSearch,
  resetAdminCollectionFilters,
  toAdminCollectionSearchParams,
} from "./collectionState.js";

/** @returns {object} URL-owned normalized collection state and transitions. */
export function useAdminCollectionState(configuration) {
  const [searchParams, setSearchParams] = useSearchParams();
  const normalized = useMemo(
    () => normalizeAdminCollectionSearch(searchParams, configuration),
    [configuration, searchParams],
  );

  useEffect(() => {
    if (!normalized.needsRepair) return;
    setSearchParams(normalized.searchParams, { replace: true });
  }, [normalized, setSearchParams]);

  const commit = (state) => setSearchParams(
    toAdminCollectionSearchParams(state, configuration),
  );
  const change = (value) => commit(
    changeAdminCollectionState(normalized.state, value),
  );

  return {
    state: normalized.state,
    hasFilters: hasAdminCollectionFilters(normalized.state),
    setPage: (page) => change({ page }),
    setPageSize: (pageSize) => change({ pageSize }),
    setSearch: (q) => change({ q: q.trim() || undefined }),
    setFilter: (name, value) => change({
      filters: { [name]: value || undefined },
    }),
    setSort: (sortField, sortDirection) => change({
      sortField,
      sortDirection,
    }),
    toggleSort: (sortField) => change({
      sortField,
      sortDirection: normalized.state.sortField === sortField &&
        normalized.state.sortDirection === "asc"
        ? "desc"
        : "asc",
    }),
    resetFilters: () => commit(resetAdminCollectionFilters(normalized.state)),
  };
}
