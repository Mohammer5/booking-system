/** @returns {Array<object>} Course Module collection filters. */
export function moduleCollectionFilters(translate) {
  return [{
    name: "state",
    label: translate("courseStructure.module.filters.state"),
    options: [
      { value: "", label: translate("adminCollections.all") },
      ...["scheduled", "cancelled"].map((state) => ({
        value: state,
        label: translate(`courseStructure.module.state.${state}`),
      })),
    ],
  }];
}

/** @returns {Array<object>} Course Module collection sorts. */
export function moduleCollectionSorts(translate) {
  return ["startsAt", "title", "state"].map((field) => ({
    field,
    ascendingLabel: translate("adminCollections.ascending", {
      field: translate(`courseStructure.module.fields.${field}`),
    }),
    descendingLabel: translate("adminCollections.descending", {
      field: translate(`courseStructure.module.fields.${field}`),
    }),
  }));
}

/** @returns {object} Shared collection control labels. */
export function moduleCollectionLabels(translate) {
  return {
    searchAction: translate("adminCollections.searchAction"),
    resetAction: translate("adminCollections.resetAction"),
    sortLabel: translate("adminCollections.sortLabel"),
  };
}

/** @returns {object} Module result-state messages. */
export function moduleCollectionResultMessages(translate) {
  return {
    loading: translate("courseStructure.module.collectionLoading"),
    empty: translate("courseStructure.module.empty"),
    filteredEmpty: translate("adminCollections.filteredEmpty"),
    pageEmpty: translate("adminCollections.pageEmpty"),
    reset: translate("adminCollections.resetAction"),
    rowsPerPage: translate("adminCollections.pagination.rowsPerPage"),
    of: translate("adminCollections.pagination.of"),
    first: translate("adminCollections.pagination.first"),
    last: translate("adminCollections.pagination.last"),
    next: translate("adminCollections.pagination.next"),
    previous: translate("adminCollections.pagination.previous"),
  };
}
