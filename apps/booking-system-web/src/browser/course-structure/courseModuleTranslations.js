export const courseModuleTranslations = {
  title: "Module",
  description:
    "Durchsuchen und verwalten Sie die beibehaltenen Module dieses Kurses.",
  summary: "{{count}} Module",
  empty: "Für diesen Kurs wurden noch keine Module angelegt.",
  collectionLoading: "Module des Kurses werden geladen …",
  search:
    "Module dieses Kurses nach Titel, Beschreibung oder Hinweisen durchsuchen",
  tableLabel: "Modulsammlung dieses Kurses",
  listLabel: "Module des Kurses",
  open: "Modul öffnen",
  fields: {
    title: "Titel",
    startsAt: "Beginn",
    endsAt: "Ende",
    state: "Status",
    action: "Aktion",
  },
  filters: { state: "Modulstatus" },
  scheduled: "Geplant",
  state: { scheduled: "Geplant", cancelled: "Abgesagt" },
  noDescription: "Keine Beschreibung",
  noInstructions: "Keine Hinweise",
  createTitle: "Modul anlegen",
  createAction: "Modul anlegen",
  createDescription:
    "Legen Sie Inhalt und zukünftigen Zeitraum in der Kurszeitzone fest.",
  toCollection: "Zur Modulsammlung",
  detailTitle: "Moduldetails",
  detailLoading: "Modul wird geladen …",
  notFound: "Das angeforderte Modul wurde nicht gefunden.",
  archivedReadOnly:
    "Dieser Kurs ist archiviert. Module und ihre historischen Daten bleiben sichtbar, können aber nicht angelegt, bearbeitet, verschoben, abgesagt oder gelöscht werden.",
  titleLabel: "Modultitel",
  titleRequired: "Bitte geben Sie einen Modultitel ein.",
  descriptionLabel: "Beschreibung",
  descriptionInvalid: "Bitte geben Sie eine gültige Beschreibung ein.",
  instructionsLabel: "Hinweise",
  instructionsInvalid: "Bitte geben Sie gültige Hinweise ein.",
  optional: "Optional",
  startsAt: "Beginn",
  endsAt: "Ende",
  startsAtLocalLabel: "Beginn (lokale Kurszeit)",
  endsAtLocalLabel: "Ende (lokale Kurszeit)",
  startsAtRequired: "Bitte geben Sie den Beginn ein.",
  endsAtRequired: "Bitte geben Sie das Ende ein.",
  startsAtInvalid: "Bitte geben Sie einen gültigen lokalen Beginn ein.",
  endsAtInvalid: "Bitte geben Sie ein gültiges lokales Ende ein.",
  startsAtNonexistent:
    "Dieser Beginn existiert wegen der Zeitumstellung in der Kurszeitzone nicht.",
  endsAtNonexistent:
    "Dieses Ende existiert wegen der Zeitumstellung in der Kurszeitzone nicht.",
  startsAtFuture: "Der Beginn muss in der Zukunft liegen.",
  endsAtAfterStart: "Das Ende muss nach dem Beginn liegen.",
  timezoneHelp:
    "Beginn und Ende werden in der Kurszeitzone {{timezone}} eingegeben.",
  disambiguationRequired:
    "Mindestens eine lokale Uhrzeit kommt zweimal vor. Wählen Sie das beabsichtigte Vorkommen ausdrücklich aus.",
  occurrenceLabel: "{{field}}: beabsichtigtes Vorkommen",
  occurrenceRequired: "Eine ausdrückliche Auswahl ist erforderlich.",
  occurrence: { earlier: "Erstes Vorkommen", later: "Zweites Vorkommen" },
  occurrenceInstant: "{{offset}}, bestimmter Zeitpunkt {{instant}}",
  resolvedInstant:
    "{{field}} ist eindeutig: {{offset}}, bestimmter Zeitpunkt {{instant}}.",
  submit: "Modul speichern",
  submitting: "Modul wird gespeichert …",
  success: "Das Modul wurde erfolgreich angelegt.",
  editDetailsTitle: "Modulinhalt bearbeiten",
  editDetailsFormLabel: "Modulinhalt bearbeiten: {{title}}",
  editTitleLabel: "Modultitel bearbeiten",
  editDescriptionLabel: "Modulbeschreibung bearbeiten",
  editInstructionsLabel: "Modulhinweise bearbeiten",
  editDetailsSubmit: "Modulinhalt speichern",
  editDetailsPending: "Modulinhalt wird gespeichert …",
  editDetailsSuccess: "Der Modulinhalt wurde gespeichert.",
  editDetailsUnavailable:
    "Das Modul hat sich geändert oder kann nicht mehr bearbeitet werden. Die aktuellen Kursdaten wurden neu geladen.",
  editScheduleTitle: "Modulzeitraum bearbeiten",
  editScheduleFormLabel: "Modulzeitraum bearbeiten: {{title}}",
  editStartsAtLocalLabel: "Neuer Beginn (lokale Kurszeit)",
  editEndsAtLocalLabel: "Neues Ende (lokale Kurszeit)",
  rescheduleSubmit: "Modulzeitraum speichern",
  reschedulePending: "Modulzeitraum wird gespeichert …",
  rescheduleSuccess: "Der Modulzeitraum wurde gespeichert.",
  rescheduleUnavailable:
    "Der Modulzeitraum hat sich geändert oder kann nicht mehr bearbeitet werden. Die aktuellen Kursdaten wurden neu geladen.",
  scheduleLocked:
    "Der Modulzeitraum ist gesperrt. Ab dem exakten Beginn und für abgesagte Module bleiben Beginn und Ende unverändert.",
  cancellationTitle: "Modulabsage",
  cancelAction: "Modul absagen",
  cancelDialogTitle: "Modul endgültig absagen?",
  cancelDescription:
    "Die Absage ist endgültig. Bestehende Modulauswahlen bleiben gespeichert und werden sofort als historische Teilnahme angezeigt. Neue, geänderte oder entfernte Auswahlen sind danach nicht mehr möglich.",
  cancelDialogCancel: "Abbrechen",
  cancelConfirm: "Modul endgültig absagen",
  cancelPending: "Modul wird abgesagt …",
  cancellationSuccess:
    "Das Modul wurde abgesagt. Bestehende Modulauswahlen bleiben als historische Teilnahme erhalten.",
  cancellationTerminal:
    "Das Modul ist endgültig abgesagt. Bestehende Modulauswahlen bleiben als historische Teilnahme erhalten und können nicht mehr geändert werden.",
  cancellationEnded:
    "Die Absagefrist ist abgelaufen. Ab dem exakten Modulende kann das Modul nicht mehr abgesagt werden.",
  cancellationDeadlineReached:
    "Das Modul hat inzwischen sein exaktes Ende erreicht und kann nicht mehr abgesagt werden.",
  cancellationUnavailable:
    "Das Modul hat sich geändert oder kann nicht mehr abgesagt werden. Die aktuellen Kursdaten wurden neu geladen.",
  deletionTitle: "Modul dauerhaft entfernen",
  deleteAction: "Modul löschen",
  deleteTitle: "Modul endgültig löschen?",
  deleteDescription:
    "Das Modul wird dauerhaft entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden. Bestehende aktuelle oder historische Modulauswahlen verhindern die Löschung.",
  deleteCancel: "Abbrechen",
  deleteConfirm: "Modul endgültig löschen",
  deletePending: "Modul wird gelöscht …",
  deleted: "Das Modul „{{title}}“ wurde endgültig gelöscht.",
  deletionBlocked:
    "Das Modul kann nicht gelöscht werden, weil mindestens eine aktuelle oder historische Modulauswahl darauf verweist.",
  deletionUnavailable:
    "Das Modul hat sich geändert oder kann im aktuellen Kursstatus nicht gelöscht werden. Die aktuellen Kursdaten wurden neu geladen.",
};
