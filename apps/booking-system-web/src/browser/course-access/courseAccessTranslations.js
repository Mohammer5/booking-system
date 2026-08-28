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
    profile: {
      selfNavigation: "Teilnahmeprofil bearbeiten",
      adminNavigation: "Teilnahmeprofil öffnen und bearbeiten",
      selfTitle: "Teilnahmeprofil bearbeiten",
      selfDescription:
        "Ändern Sie den Namen und die E-Mail-Adresse Ihres Teilnahmeprofils.",
      adminTitle: "Teilnahmeprofil verwalten",
      adminDescription:
        "Bearbeiten Sie Name und E-Mail-Adresse dieses Teilnahmeprofils unabhängig von Kurszuordnungen.",
      providerNotice:
        "Diese Angaben gehören zum Buchungssystem und werden nicht als vom Anmeldeanbieter bestätigt behandelt.",
      nameLabel: "Name",
      emailLabel: "E-Mail-Adresse",
      nameRequired: "Bitte geben Sie einen Namen ein.",
      emailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      submit: "Teilnahmeprofil speichern",
      submitting: "Teilnahmeprofil wird gespeichert …",
      success: "Das Teilnahmeprofil wurde erfolgreich aktualisiert.",
      emailConflict:
        "Diese E-Mail-Adresse wird bereits für ein anderes Teilnahmeprofil verwendet.",
      selfUnavailable:
        "Ihr Teilnahmeprofil kann im aktuellen Zugriffsstatus nicht bearbeitet werden.",
      adminUnavailable:
        "Dieses Teilnahmeprofil kann im aktuellen Administrationsstatus nicht bearbeitet werden.",
      technicalError:
        "Das Teilnahmeprofil konnte nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
      loading: "Teilnahmeprofil wird geladen …",
      toParticipantHome: "Zurück zum Teilnahmebereich",
      toDirectory: "Zurück zum Verzeichnis der Teilnehmenden",
    },
    membership: {
      title: "Kurszuordnungen",
      assign: "Teilnehmende zuordnen",
      loading: "Kurszuordnungen werden geladen …",
      empty: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
      listLabel: "Teilnehmende dieses Kurses",
      created: "Die Kurszuordnung wurde erfolgreich angelegt.",
      "already-active":
        "Die aktive Kurszuordnung bestand bereits und blieb unverändert.",
      reactivated:
        "Die bestehende Kurszuordnung wurde reaktiviert. Zuvor entfernte künftige Modulauswahlen wurden nicht wiederhergestellt.",
      revoked:
        "Die Kurszuordnung wurde widerrufen und der Kurszugriff entfernt.",
      "already-revoked":
        "Die Kurszuordnung war bereits widerrufen und blieb unverändert.",
    },
    lifecycle: {
      revokeAction: "Kurszuordnung widerrufen",
      reactivateAction: "Kurszuordnung reaktivieren",
      revokeTitle: "Kurszuordnung widerrufen?",
      reactivateTitle: "Kurszuordnung reaktivieren?",
      revokeDescription:
        "Der Kurszugriff endet sofort. Künftige Auswahlen für noch nicht begonnene geplante Module werden entfernt; bereits begonnene oder abgesagte Modulauswahlen bleiben als Historie erhalten.",
      reactivateDescription:
        "Der zulässige Kurszugriff wird wiederhergestellt. Beim Widerruf entfernte künftige Modulauswahlen kehren nicht zurück.",
      cancel: "Abbrechen",
      revokeConfirm: "Zuordnung endgültig widerrufen",
      reactivateConfirm: "Zuordnung reaktivieren",
      revokePending: "Kurszuordnung wird widerrufen …",
      reactivatePending: "Kurszuordnung wird reaktiviert …",
      unavailable:
        "Die Kurszuordnung kann wegen eines geänderten Administrations-, Kurs- oder Zuordnungsstatus nicht bearbeitet werden.",
      archivedReactivationUnavailable:
        "Eine widerrufene Zuordnung kann in einem archivierten Kurs nicht reaktiviert werden.",
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
        current: "Ausgewählte Gruppe: {{group}}",
        live: "Aktuelle Teilnahme",
        historical: "Historische Teilnahme",
        deadline: "Änderbar bis zum Modulbeginn: {{instant}}",
        locked: "Diese Modulauswahl kann ab dem Modulbeginn nicht mehr geändert werden.",
        groupLabel: "Gruppe auswählen",
        required: "Bitte wählen Sie ausdrücklich eine Gruppe aus.",
        noGroups: "Für dieses Modul ist derzeit keine aktive Gruppe verfügbar.",
        save: "Modulauswahl speichern",
        saving: "Modulauswahl wird gespeichert …",
        created: "Die Modulauswahl wurde erfolgreich gespeichert.",
        changed: "Die ausgewählte Gruppe wurde erfolgreich geändert.",
        "already-selected": "Diese Gruppe war bereits ausgewählt und blieb unverändert.",
        remove: "Modulauswahl entfernen",
        removeTitle: "Modulauswahl entfernen?",
        removeDescription:
          "Die aktuelle Gruppenauswahl wird entfernt. Danach nehmen Sie an diesem Modul nicht teil.",
        cancel: "Abbrechen",
        confirmRemove: "Auswahl endgültig entfernen",
        removing: "Modulauswahl wird entfernt …",
        removed: "Die Modulauswahl wurde erfolgreich entfernt.",
        "already-absent": "Für dieses Modul bestand bereits keine Auswahl.",
        unavailable:
          "Die Modulauswahl ist wegen eines geänderten Kurs-, Zuordnungs- oder Zeitstatus nicht mehr verfügbar.",
        technicalError:
          "Die Modulauswahl konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      },
    },
  },
};
