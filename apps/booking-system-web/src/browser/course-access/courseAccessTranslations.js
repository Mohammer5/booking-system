import { adminParticipationTranslations } from "./adminParticipationTranslations.js";

export const courseAccessTranslations = {
  courseAccess: {
    invite: {
      title: "Geteilte Kurseinladung",
      description:
        "Dieser Link kann von mehreren Personen verwendet und weitergegeben werden. Er läuft nicht automatisch ab.",
      loading: "Kurseinladung wird geladen …",
      none: "Für diesen Kurs besteht noch keine geteilte Einladung.",
      create: "Kurseinladung erstellen",
      createPending: "Kurseinladung wird erstellt …",
      created: "Die Kurseinladung wurde erfolgreich erstellt.",
      copy: "Einladungslink kopieren",
      copied: "Der Einladungslink wurde kopiert.",
      disable: "Kurseinladung deaktivieren",
      disableTitle: "Kurseinladung deaktivieren?",
      disableDescription:
        "Der vorhandene Link bleibt erkennbar, kann aber nicht mehr für einen Beitritt verwendet werden. Er kann später wieder aktiviert werden.",
      disableConfirm: "Kurseinladung deaktivieren",
      disablePending: "Kurseinladung wird deaktiviert …",
      disabled: "Die Kurseinladung wurde deaktiviert.",
      reenable: "Kurseinladung wieder aktivieren",
      reenablePending: "Kurseinladung wird wieder aktiviert …",
      "re-enabled": "Die Kurseinladung wurde wieder aktiviert.",
      replace: "Kurseinladung dauerhaft ersetzen",
      replaceTitle: "Kurseinladung dauerhaft ersetzen?",
      replaceDescription:
        "Der bisherige Link wird dauerhaft ungültig und kann nicht wieder aktiviert werden. Ein neuer aktiver Link wird erstellt.",
      replaceConfirm: "Kurseinladung endgültig ersetzen",
      replacePending: "Kurseinladung wird ersetzt …",
      replaced: "Die Kurseinladung wurde dauerhaft ersetzt.",
      cancel: "Abbrechen",
      stale:
        "Die Kurseinladung kann wegen eines geänderten Administrations-, Kurs- oder Einladungsstatus nicht bearbeitet werden.",
      technicalError:
        "Die Kurseinladung konnte nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
      state: {
        enabled: "Einladung: Aktiv",
        disabled: "Einladung: Deaktiviert",
      },
    },
    publicInvite: {
      title: "Kurseinladung",
      description:
        "Prüfen Sie die Einladung, melden Sie sich an und entscheiden Sie anschließend ausdrücklich über den Kursbeitritt.",
      loading: "Kurseinladung wird geprüft …",
      available: "Diese Kurseinladung ist verfügbar.",
      unavailable: "Diese Kurseinladung ist nicht verfügbar.",
      signInDescription:
        "Melden Sie sich mit Google an. Dadurch treten Sie dem Kurs noch nicht bei.",
      onboardingDescription:
        "Richten Sie zuerst Ihr Teilnahmeprofil ein. Auch dadurch treten Sie dem Kurs noch nicht bei.",
      disabledParticipant:
        "Dieses Teilnahmeprofil ist deaktiviert. Ein Kursbeitritt ist nicht möglich.",
      joinDescription:
        "Die Einladung ist verfügbar. Erst mit der folgenden Bestätigung treten Sie dem Kurs bei.",
      join: "Kursbeitritt prüfen",
      joinTitle: "Kurs beitreten?",
      joinConfirmation:
        "Möchten Sie dem Kurs „{{courseName}}“ jetzt verbindlich beitreten?",
      cancel: "Abbrechen",
      joinConfirm: "Jetzt Kurs beitreten",
      joining: "Kursbeitritt wird geprüft …",
      joined: "Sie sind dem Kurs erfolgreich beigetreten.",
      "already-joined": "Sie sind diesem Kurs bereits zugeordnet.",
      "assignment-revoked":
        "Ihre frühere Kurszuordnung wurde widerrufen und kann mit dieser Einladung nicht reaktiviert werden.",
      "invite-unavailable":
        "Der Kursbeitritt ist nicht mehr verfügbar. Es wurde keine Kurszuordnung geändert.",
      toCourse: "Zum Kurs",
      joinTechnicalError:
        "Der Kursbeitritt konnte nicht geprüft werden. Bitte versuchen Sie es erneut.",
      technicalError:
        "Die Kurseinladung konnte nicht geprüft werden. Bitte versuchen Sie es erneut.",
    },
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
    adminParticipation: adminParticipationTranslations,
    participantState: {
      active: "Teilnahmeprofil: Aktiv",
      disabled: "Teilnahmeprofil: Deaktiviert",
    },
    participantLifecycle: {
      disableAction: "Teilnahmeprofil deaktivieren",
      reenableAction: "Teilnahmeprofil wieder aktivieren",
      disableTitle: "Teilnahmeprofil deaktivieren?",
      reenableTitle: "Teilnahmeprofil wieder aktivieren?",
      disableDescription:
        "Der normale Teilnahmezugriff endet in allen Kursen. Künftige Auswahlen für noch nicht begonnene geplante Module werden entfernt. Kurszuordnungen sowie bereits begonnene, beendete oder abgesagte Teilnahmehistorie bleiben erhalten.",
      reenableDescription:
        "Der Teilnahmezugriff wird wieder verfügbar, soweit eine aktive Kurszuordnung ihn erlaubt. Zuvor entfernte künftige Modulauswahlen kehren nicht zurück.",
      cancel: "Abbrechen",
      disableConfirm: "Teilnahmeprofil endgültig deaktivieren",
      reenableConfirm: "Teilnahmeprofil wieder aktivieren",
      disablePending: "Teilnahmeprofil wird deaktiviert …",
      reenablePending: "Teilnahmeprofil wird wieder aktiviert …",
      disabled:
        "Das Teilnahmeprofil wurde deaktiviert. Entfernte künftige Modulauswahlen: {{count}}.",
      "re-enabled":
        "Das Teilnahmeprofil wurde wieder aktiviert. Zuvor entfernte Modulauswahlen wurden nicht wiederhergestellt.",
      unavailable:
        "Der Teilnahmestatus kann wegen eines geänderten Administrations- oder Profilstatus nicht bearbeitet werden.",
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
      archivedReadOnly:
        "Der archivierte Kurs ist schreibgeschützt. Aktive Kurszuordnungen können nur noch widerrufen werden; neue oder widerrufene Zuordnungen können nicht hinzugefügt oder reaktiviert werden.",
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
        archived: "Archiviert",
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
        archivedReadOnly:
          "Dieser Kurs ist archiviert. Sie können die Kursstruktur und Ihre eigene historische Modulauswahl lesen, aber keine Auswahl anlegen, ändern oder entfernen.",
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
        groupNoDetails: "Keine weiteren Angaben zur ausgewählten Gruppe",
        groupState: {
          active: "Gruppenstatus: Aktiv",
          archived: "Gruppenstatus: Archiviert",
        },
        live: "Aktuelle Teilnahme",
        historical: "Historische Teilnahme",
        deadline: "Änderbar bis zum Modulbeginn: {{instant}}",
        locked: "Diese Modulauswahl kann ab dem Modulbeginn nicht mehr geändert werden.",
        cancelledLocked:
          "Das Modul wurde abgesagt. Eine bestehende Auswahl bleibt als historische Teilnahme erhalten; sie kann nicht neu angelegt, geändert oder entfernt werden.",
        archivedLocked:
          "Der Kurs ist archiviert. Eine bestehende Auswahl bleibt als historische Teilnahme erhalten; neue, geänderte oder entfernte Auswahlen sind nicht möglich.",
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
