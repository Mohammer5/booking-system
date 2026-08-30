/** @returns {Array<object>} Course Participant filters. */
export function courseParticipantFilters(translate) {
  return [
    {
      name: "participantState",
      label: translate("courseAccess.courseParticipants.filters.participantState"),
      options: optionSet(translate, "participantState", ["active", "disabled"]),
    },
    {
      name: "assignmentState",
      label: translate("courseAccess.courseParticipants.filters.assignmentState"),
      options: optionSet(translate, "assignmentState", ["active", "revoked"]),
    },
  ];
}

/** @returns {Array<object>} Course Participant sort choices. */
export function courseParticipantSorts(translate) {
  return ["name", "email", "participantState", "assignmentState"].map(
    (field) => ({
      field,
      ascendingLabel: translate("adminCollections.ascending", {
        field: translate(`courseAccess.courseParticipants.fields.${field}`),
      }),
      descendingLabel: translate("adminCollections.descending", {
        field: translate(`courseAccess.courseParticipants.fields.${field}`),
      }),
    }),
  );
}

/** @returns {object} Shared localized collection controls. */
export function courseParticipantCollectionLabels(translate) {
  return {
    searchAction: translate("adminCollections.searchAction"),
    resetAction: translate("adminCollections.resetAction"),
    sortLabel: translate("adminCollections.sortLabel"),
  };
}

/** @returns {object} Course Participant result messages. */
export function courseParticipantResultMessages(translate) {
  return {
    loading: translate("courseAccess.courseParticipants.loading"),
    empty: translate("courseAccess.courseParticipants.empty"),
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

/** @returns {Array<object>} One translated filter option set. */
function optionSet(translate, type, values) {
  return [
    { value: "", label: translate("adminCollections.all") },
    ...values.map((value) => ({
      value,
      label: translate(`courseAccess.${type}.${value}`),
    })),
  ];
}
