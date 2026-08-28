export const courseAccessTranslations = {
  courseAccess: {
    navigation: {
      participants: "Teilnehmende verwalten",
      toAdministration: "Zur Administration",
    },
    status: {
      unavailable:
        "Die Teilnahmeverwaltung ist für dieses Administrationskonto oder diesen Kurs nicht verfügbar.",
      technicalError:
        "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
    },
    participantState: {
      active: "Teilnahmeprofil: Aktiv",
      disabled: "Teilnahmeprofil: Deaktiviert",
    },
    assignmentState: {
      active: "Kurszuordnung: Aktiv",
      revoked: "Kurszuordnung: Widerrufen",
    },
    directory: {
      title: "Teilnehmende",
      description:
        "Alle vollständig registrierten Teilnahmeprofile, unabhängig von bestehenden Kurszuordnungen.",
      loading: "Teilnehmende werden geladen …",
      empty: "Es wurden noch keine Teilnahmeprofile registriert.",
      listLabel: "Verzeichnis der Teilnehmenden",
    },
    membership: {
      title: "Kurszuordnungen",
      assign: "Teilnehmende zuordnen",
      loading: "Kurszuordnungen werden geladen …",
      empty: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
      listLabel: "Teilnehmende dieses Kurses",
      created: "Die Kurszuordnung wurde erfolgreich angelegt.",
      alreadyActive:
        "Die aktive Kurszuordnung bestand bereits und blieb unverändert.",
    },
    assignmentDialog: {
      title: "Teilnehmende zum Kurs zuordnen",
      description:
        "Wählen Sie ein registriertes Teilnahmeprofil. Die Zuordnung erstellt nur die Kursmitgliedschaft und keine Modulauswahl.",
      participantLabel: "Teilnahmeprofil",
      loading: "Teilnehmende werden geladen …",
      empty: "Es ist kein registriertes Teilnahmeprofil verfügbar.",
      selectionRequired: "Bitte wählen Sie ein Teilnahmeprofil aus.",
      cancel: "Abbrechen",
      submit: "Kurszuordnung speichern",
      submitting: "Kurszuordnung wird gespeichert …",
    },
    participantCourses: {
      status: {
        unavailable:
          "Dieser Kursbereich ist für Ihr aktuelles Teilnahmeprofil nicht verfügbar.",
        technicalError:
          "Die Kursdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
      },
      state: {
        active: "Aktiv",
      },
      list: {
        title: "Meine Kurse",
        loading: "Kurszuordnungen werden geladen …",
        emptyTitle: "Noch keinen Kursen zugeordnet",
        emptyDescription:
          "Ihr aktives Teilnahmeprofil ist noch keinem Kurs zugeordnet. Es gibt kein öffentliches Kursverzeichnis.",
        label: "Zugeordnete Kurse",
      },
      detail: {
        title: "Kursdetails",
        loading: "Kursdetails werden geladen …",
        toList: "Zurück zu meinen Kursen",
        timezone: "Zeitzone",
        state: "Status",
      },
      modules: {
        title: "Module",
        empty: "Für diesen Kurs sind noch keine Module vorhanden.",
        label: "Module dieses Kurses",
        scheduled: "Geplant",
        cancelled: "Abgesagt",
        startsAt: "Beginn",
        endsAt: "Ende",
      },
      groups: {
        title: "Gruppen",
        empty: "Für diesen Kurs sind keine aktiven Gruppen vorhanden.",
        label: "Aktive Gruppen dieses Kurses",
      },
      selection: {
        title: "Eigene Modulauswahl",
        none: "Keine Auswahl",
        noneDescription: "Für dieses Modul ist keine Gruppe ausgewählt.",
      },
    },
  },
};
