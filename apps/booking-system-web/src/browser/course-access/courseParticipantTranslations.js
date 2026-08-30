export const courseParticipantTranslations = {
  assignmentState: {
    active: "Kurszuordnung: Aktiv",
    revoked: "Kurszuordnung: Widerrufen",
  },
  participantPicker: {
    searchLabel: "Teilnahmeprofile nach Name oder E-Mail durchsuchen",
    searchAction: "Suchen",
    label: "Teilnahmeprofil auswählen",
    loading: "Teilnahmeprofile werden gesucht …",
    empty: "Es ist kein registriertes Teilnahmeprofil verfügbar.",
    noResults: "Die Suche ergab kein Teilnahmeprofil.",
    unavailable:
      "Die Teilnahmeprofile konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    resultHint:
      "Es werden höchstens zehn Treffer angezeigt. Verfeinern Sie die Suche bei Bedarf.",
    required: "Bitte wählen Sie ein verfügbares Teilnahmeprofil aus.",
    noAssignment: "Kurszuordnung: Nicht vorhanden",
  },
  courseParticipants: {
    title: "Teilnehmende",
    description:
      "Alle beibehaltenen Kurszuordnungen mit globalem Profil- und Zuordnungsstatus.",
    summary: "{{count}} Teilnehmende",
    loading: "Teilnehmende des Kurses werden geladen …",
    empty: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
    search: "Teilnehmende dieses Kurses nach Name oder E-Mail durchsuchen",
    tableLabel: "Teilnehmende und Kurszuordnungen dieses Kurses",
    listLabel: "Teilnehmende dieses Kurses",
    detailAction: "Teilnahme öffnen",
    fields: {
      name: "Name",
      email: "E-Mail-Adresse",
      participantState: "Profilstatus",
      assignmentState: "Kurszuordnung",
      action: "Aktion",
    },
    filters: {
      participantState: "Profilstatus",
      assignmentState: "Zuordnungsstatus",
    },
    detail: {
      loadingTitle: "Kursteilnahme",
      assignmentTitle: "Kurszuordnung",
      assignmentReadOnly:
        "Diese Kurszuordnung ist im archivierten Kurs schreibgeschützt.",
    },
  },
};

export const courseParticipantLifecycleTranslations = {
  assignAction: "Kurszuordnung anlegen",
  assignTitle: "Kurszuordnung anlegen?",
  assignDescription:
    "Das Teilnahmeprofil erhält Zugriff auf diesen Kurs. Dadurch entsteht noch keine Modulauswahl.",
  assignConfirm: "Kurszuordnung anlegen",
  assignPending: "Kurszuordnung wird angelegt …",
};
