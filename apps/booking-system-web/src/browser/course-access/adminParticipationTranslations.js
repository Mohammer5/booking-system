export const adminParticipationTranslations = {
  open: "Kursteilnahme ansehen",
  title: "Kursteilnahme",
  description:
    "Lesen Sie Kurszuordnungen, Teilnahmeprofile, Kursstruktur und aktuelle oder historische Modulauswahlen.",
  loading: "Kursteilnahme wird geladen …",
  unavailable:
    "Die Kursteilnahme ist für dieses Administrationskonto oder diesen Kurs nicht verfügbar.",
  technicalError:
    "Die Kursteilnahme konnte nicht geladen werden. Bitte versuchen Sie es erneut.",
  archived:
    "Dieser Kurs ist archiviert. Alle angezeigten Modulauswahlen sind historische Teilnahme.",
  toCourse: "Zurück zum Kurs",
  toOverview: "Zurück zur Kursteilnahme",
  participants: {
    title: "Teilnehmende und Kurszuordnungen",
    assistedDescription:
      "Öffnen Sie ein aktives Teilnahmeprofil, um eine gewöhnliche Modulauswahl stellvertretend zu verwalten. Eine fehlende oder widerrufene Kurszuordnung wird erst mit einer erfolgreichen Auswahl aktiv.",
    manageSelection: "Modulauswahl stellvertretend verwalten",
    empty: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
    tableLabel: "Kursteilnahme dieses Kurses",
    participant: "Teilnahmeprofil",
    email: "E-Mail-Adresse",
    profileState: "Profilstatus",
    assignmentState: "Kurszuordnung",
    action: "Aktion",
    detail: "Teilnahme ansehen",
  },
  structure: {
    modulesTitle: "Module",
    modulesEmpty: "Für diesen Kurs sind keine Module vorhanden.",
    modulesLabel: "Module der administrativen Kursteilnahme",
    groupsTitle: "Gruppen",
    groupsEmpty: "Für diesen Kurs sind keine Gruppen vorhanden.",
    groupsLabel: "Gruppen der administrativen Kursteilnahme",
    scheduled: "Modulstatus: Geplant",
    cancelled: "Modulstatus: Abgesagt",
    activeGroup: "Gruppenstatus: Aktiv",
    archivedGroup: "Gruppenstatus: Archiviert",
    startsAt: "Beginn",
    endsAt: "Ende",
    noDescription: "Keine Beschreibung",
    noDetails: "Keine weiteren Angaben",
  },
  detail: {
    title: "Teilnahme von {{name}}",
    description:
      "Kurszuordnung und Modulauswahlen dieses Teilnahmeprofils im aktuellen Lebenszyklus.",
    unavailable:
      "Dieses Teilnahmeprofil gehört nicht zur verfügbaren Kursteilnahme.",
    noAssignment: "Kurszuordnung: Nicht vorhanden",
    modulesTitle: "Modulauswahlen",
    modulesEmpty: "Für diesen Kurs sind keine Module vorhanden.",
    modulesLabel: "Modulauswahlen von {{name}}",
    noSelection: "Keine Auswahl",
    noSelectionDescription:
      "Für dieses Modul ist keine Gruppe ausgewählt.",
    selectedGroup: "Ausgewählte Gruppe: {{name}}",
    live: "Auswahlstatus: Aktuelle Teilnahme",
    historical: "Auswahlstatus: Historische Teilnahme",
    upcoming: "Phase: Bevorstehend",
    inProgress: "Phase: Laufend",
    historicalPhase: "Phase: Historisch",
  },
  target: {
    title: "Teilnahmeprofil für Modulauswahl öffnen",
    description:
      "Wählen Sie ein vollständig registriertes aktives Teilnahmeprofil. Deaktivierte Profile sind sichtbar, können aber nicht gebucht werden.",
    label: "Teilnahmeprofil",
    loading: "Teilnahmeprofile werden geladen …",
    empty: "Es ist kein registriertes Teilnahmeprofil verfügbar.",
    unavailable:
      "Die Teilnahmeprofile konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    required: "Bitte wählen Sie ein aktives Teilnahmeprofil aus.",
    noAssignment: "Kurszuordnung: Nicht vorhanden",
    cancel: "Abbrechen",
    open: "Modulauswahlen öffnen",
  },
  assisted: {
    title: "Stellvertretende Modulauswahl",
    assignment: {
      created:
        "Folge beim Speichern: Eine gewöhnliche aktive Kurszuordnung wird erstellt.",
      reactivated:
        "Folge beim Speichern: Die widerrufene gewöhnliche Kurszuordnung wird reaktiviert.",
      unchanged:
        "Folge beim Speichern: Die aktive Kurszuordnung bleibt unverändert.",
    },
    assignmentMeaning:
      "Eine Kurszuordnung allein ist keine Modulteilnahme. Nur die ausdrücklich gespeicherte Gruppenauswahl bedeutet Teilnahme an diesem Modul.",
    groupLabel: "Aktive Gruppe auswählen",
    required: "Bitte wählen Sie eine aktive Gruppe aus.",
    noGroups: "Für diesen Kurs ist keine aktive Gruppe auswählbar.",
    save: "Modulauswahl speichern",
    saving: "Modulauswahl wird gespeichert …",
    locked:
      "Diese Modulauswahl ist wegen des aktuellen Profil-, Kurs- oder Modulstatus oder ab dem exakten Modulbeginn nicht bearbeitbar.",
    remove: "Modulauswahl entfernen",
    removeTitle: "Modulauswahl entfernen?",
    removeDescription:
      "Die Auswahl wird entfernt und bedeutet danach keine Teilnahme an diesem Modul. Eine fehlende oder widerrufene Kurszuordnung wird dabei nicht erstellt oder reaktiviert.",
    cancel: "Abbrechen",
    confirmRemove: "Auswahl endgültig entfernen",
    removing: "Modulauswahl wird entfernt …",
    stale:
      "Die Auswahl wurde nicht geändert, weil sich Profil, Berechtigung, Kurs, Modul, Gruppe oder Frist geändert hat.",
    unavailable:
      "Die Modulauswahl ist für dieses Ziel nicht verfügbar und wurde nicht geändert.",
    validationError: "Bitte wählen Sie eine gültige aktive Gruppe aus.",
    technicalError:
      "Die Modulauswahl konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    result: {
      created: "Die Modulauswahl wurde angelegt.",
      changed: "Die Modulauswahl wurde ersetzt.",
      "already-selected": "Diese Gruppe war bereits ausgewählt.",
      removed: "Die Modulauswahl wurde entfernt.",
      "already-absent": "Es bestand bereits keine Modulauswahl.",
    },
    assignmentResult: {
      created: "Die gewöhnliche Kurszuordnung wurde dabei erstellt.",
      reactivated: "Die gewöhnliche Kurszuordnung wurde dabei reaktiviert.",
      "already-active": "Die aktive Kurszuordnung blieb unverändert.",
    },
  },
};
