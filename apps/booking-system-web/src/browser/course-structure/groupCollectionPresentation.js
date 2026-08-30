/** @returns {Array<object>} Course Group collection filters. */
export function groupCollectionFilters(translate) {
  return [{
    name: "state",
    label: translate("courseStructure.group.filters.state"),
    options: [
      { value: "", label: translate("adminCollections.all") },
      ...["active", "archived"].map((state) => ({
        value: state,
        label: translate(`courseStructure.state.${state}`),
      })),
    ],
  }];
}

/** @returns {Array<object>} Course Group collection sorts. */
export function groupCollectionSorts(translate) {
  return ["name", "state"].map((field) => ({
    field,
    ascendingLabel: translate("adminCollections.ascending", {
      field: translate(`courseStructure.group.fields.${field}`),
    }),
    descendingLabel: translate("adminCollections.descending", {
      field: translate(`courseStructure.group.fields.${field}`),
    }),
  }));
}

/** @returns {object} Shared collection control labels. */
export function groupCollectionLabels(translate) {
  return {
    searchAction: translate("adminCollections.searchAction"),
    resetAction: translate("adminCollections.resetAction"),
    sortLabel: translate("adminCollections.sortLabel"),
  };
}

/** @returns {object} Group result-state messages. */
export function groupCollectionResultMessages(translate) {
  return {
    loading: translate("courseStructure.group.collectionLoading"),
    empty: translate("courseStructure.group.empty"),
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
