/** @returns {Array<object>} Localized Invite filters. */
export function inviteFilters(translate) {
  return [{
    name: "state",
    label: translate("adminInvites.filters.state"),
    options: [
      { value: "", label: translate("adminCollections.all") },
      ...["active", "claimed", "revoked"].map((state) => ({
        value: state,
        label: translate(`adminInvites.state.${state}`),
      })),
    ],
  }];
}

/** @returns {Array<object>} Localized Invite sort choices. */
export function inviteSorts(translate) {
  return ["createdAt", "state"].map((field) => ({
    field,
    ascendingLabel: translate("adminCollections.ascending", {
      field: translate(`adminInvites.fields.${field}`),
    }),
    descendingLabel: translate("adminCollections.descending", {
      field: translate(`adminInvites.fields.${field}`),
    }),
  }));
}

/** @returns {object} Shared localized control labels. */
export function collectionLabels(translate) {
  return {
    searchAction: translate("adminCollections.searchAction"),
    resetAction: translate("adminCollections.resetAction"),
    sortLabel: translate("adminCollections.sortLabel"),
  };
}

/** @returns {object} Localized Invite result messages. */
export function resultMessages(translate) {
  return {
    loading: translate("adminInvites.status.loading"),
    empty: translate("adminInvites.status.empty"),
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
