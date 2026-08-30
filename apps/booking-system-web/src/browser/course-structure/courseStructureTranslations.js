export const courseStructureTranslations = {
  courseStructure: {
    breadcrumbs: {
      label: "Kurspfad",
      courses: "Kurse",
    },
    navigation: {
      toAdministration: "Zur Administration",
      toIndex: "Zur Kursübersicht",
    },
    state: {
      active: "Aktiv",
      archived: "Archiviert",
    },
    status: {
      unavailable:
        "Die Kursverwaltung ist für dieses Administrationskonto nicht verfügbar.",
      technicalError:
        "Die Kursdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    },
    index: {
      title: "Kurse",
      description: "Durchsuchen und öffnen Sie die verwalteten Kurse.",
      create: "Kurs anlegen",
      loading: "Kurse werden geladen …",
      empty: "Es wurden noch keine Kurse angelegt.",
      search: "Kurse durchsuchen",
      tableLabel: "Kurssammlung",
      listLabel: "Kursliste",
      open: "Kurs öffnen",
      fields: {
        name: "Name",
        state: "Status",
        timezone: "Zeitzone",
        action: "Aktion",
      },
      filters: {
        state: "Kursstatus",
      },
    },
    create: {
      title: "Kurs anlegen",
      description:
        "Legen Sie den Namen, eine optionale Beschreibung und die IANA-Zeitzone des Kurses fest.",
      nameLabel: "Kursname",
      nameRequired: "Bitte geben Sie einen Kursnamen ein.",
      descriptionLabel: "Beschreibung",
      descriptionOptional: "Optional",
      descriptionInvalid: "Bitte geben Sie eine gültige Beschreibung ein.",
      timezoneLabel: "Zeitzone (IANA)",
      timezoneHelp: "Standard: Europe/Berlin",
      timezoneInvalid:
        "Bitte geben Sie eine gültige IANA-Zeitzone statt eines festen UTC-Offsets ein.",
      submit: "Kurs speichern",
      submitting: "Kurs wird gespeichert …",
      success: "Der Kurs wurde erfolgreich angelegt.",
    },
    detail: {
      title: "Kursdetails",
      loading: "Kurs wird geladen …",
      notFound: "Der angeforderte Kurs wurde nicht gefunden.",
      description: "Beschreibung",
      noDescription: "Keine Beschreibung",
      timezone: "Zeitzone",
      state: "Status",
    },
    edit: {
      title: "Kurs bearbeiten",
      description:
        "Ändern Sie den Kursnamen und die optionale Beschreibung. Die Zeitzone kann nur vor dem ersten erfolgreich angelegten Modul geändert werden.",
      nameLabel: "Kursname bearbeiten",
      nameRequired: "Bitte geben Sie einen Kursnamen ein.",
      descriptionLabel: "Kursbeschreibung bearbeiten",
      descriptionOptional: "Optional",
      descriptionInvalid: "Bitte geben Sie eine gültige Beschreibung ein.",
      timezoneLabel: "Kurszeitzone bearbeiten (IANA)",
      timezoneHelp:
        "Nur vor dem ersten erfolgreich angelegten Modul änderbar.",
      timezoneInvalid:
        "Bitte geben Sie eine gültige IANA-Zeitzone statt eines festen UTC-Offsets ein.",
      timezoneLocked:
        "Die Kurszeitzone {{timezone}} ist dauerhaft gesperrt, weil bereits ein Modul erfolgreich angelegt wurde. Auch das spätere Löschen aller Module entsperrt sie nicht.",
      submit: "Kursänderungen speichern",
      submitting: "Kursänderungen werden gespeichert …",
      success: "Die Kursänderungen wurden gespeichert.",
      unavailable:
        "Der Kurs hat sich geändert oder kann nicht mehr bearbeitet werden. Die aktuellen Kursdaten wurden neu geladen.",
    },
    archival: {
      title: "Kurs archivieren",
      summary:
        "Die Archivierung ist endgültig und erst möglich, wenn alle geplanten Module beendet oder abgesagt sind.",
      action: "Kurs archivieren",
      dialogTitle: "Kurs endgültig archivieren?",
      description:
        "Danach bleiben Kursstruktur, Zuordnungen und Modulauswahlen unverändert als Historie erhalten. Der Kurs kann nicht reaktiviert werden und ist bis auf den Widerruf aktiver Kurszuordnungen schreibgeschützt.",
      blocked:
        "Der Kurs kann noch nicht archiviert werden, weil mindestens ein geplantes Modul sein exaktes Ende noch nicht erreicht hat. Warten Sie bis zum Ende oder sagen Sie das Modul zuvor ausdrücklich ab.",
      cancel: "Abbrechen",
      confirm: "Kurs endgültig archivieren",
      pending: "Kurs wird archiviert …",
      success:
        "Der Kurs wurde endgültig archiviert. Alle bestehenden Daten blieben unverändert erhalten.",
      unavailable:
        "Der Kursstatus hat sich geändert oder der Kurs kann nicht mehr archiviert werden. Die aktuellen Kursdaten wurden neu geladen.",
      readOnly:
        "Dieser Kurs ist endgültig archiviert. Kurs, Gruppen und Module bleiben zur Einsicht erhalten und können nicht mehr bearbeitet werden. Aktive Kurszuordnungen können weiterhin widerrufen werden.",
    },
    group: {
      title: "Gruppen",
      description:
        "Durchsuchen und verwalten Sie die beibehaltenen Gruppen dieses Kurses.",
      summary: "{{count}} Gruppen",
      empty: "Für diesen Kurs wurden noch keine Gruppen angelegt.",
      collectionLoading: "Gruppen des Kurses werden geladen …",
      search: "Gruppen dieses Kurses nach Name oder Details durchsuchen",
      tableLabel: "Gruppensammlung dieses Kurses",
      listLabel: "Gruppen des Kurses",
      open: "Gruppe öffnen",
      fields: {
        name: "Name",
        details: "Details",
        state: "Status",
        action: "Aktion",
      },
      filters: {
        state: "Gruppenstatus",
      },
      noDetails: "Keine weiteren Angaben",
      createAction: "Gruppe anlegen",
      createTitle: "Gruppe anlegen",
      createDescription:
        "Legen Sie den Namen und optionale freie Details der kursweiten Gruppe fest.",
      toCollection: "Zur Gruppensammlung",
      detailTitle: "Gruppendetails",
      detailLoading: "Gruppe wird geladen …",
      notFound: "Die angeforderte Gruppe wurde nicht gefunden.",
      archivedReadOnly:
        "Dieser Kurs ist archiviert. Gruppen bleiben sichtbar, können aber nicht angelegt, bearbeitet, reaktiviert, archiviert oder gelöscht werden.",
      nameLabel: "Gruppenname",
      nameRequired: "Bitte geben Sie einen Gruppennamen ein.",
      nameConflict:
        "Eine aktive Gruppe mit diesem Namen existiert bereits in diesem Kurs.",
      detailsLabel: "Details",
      detailsOptional: "Optional, zum Beispiel Raum oder Zugangsangaben",
      detailsInvalid: "Bitte geben Sie gültige freie Details ein.",
      submit: "Gruppe speichern",
      submitting: "Gruppe wird gespeichert …",
      success: "Die Gruppe wurde erfolgreich angelegt.",
      editTitle: "Gruppe bearbeiten",
      editNameLabel: "Gruppenname bearbeiten",
      editDetailsLabel: "Gruppendetails bearbeiten",
      editSubmit: "Gruppenänderungen speichern",
      editPending: "Gruppenänderungen werden gespeichert …",
      editSuccess: "Die Gruppenänderungen wurden gespeichert.",
      editUnavailable:
        "Die Gruppe hat sich geändert oder kann nicht mehr bearbeitet werden. Die aktuellen Kursdaten wurden neu geladen.",
      archiveAction: "Gruppe archivieren",
      reactivateAction: "Gruppe reaktivieren",
      archiveTitle: "Gruppe archivieren?",
      reactivateTitle: "Gruppe reaktivieren?",
      archiveDescription:
        "Die Gruppe steht danach nicht mehr für neue zukünftige Modulauswahlen zur Verfügung. Bestehende Auswahlen werden weder entfernt noch geändert. Eine Auswahl für ein noch nicht begonnenes geplantes Modul verhindert die Archivierung.",
      reactivateDescription:
        "Die Gruppe steht danach wieder für neue zukünftige Modulauswahlen zur Verfügung. Zuvor entfernte Auswahlen werden nicht wiederhergestellt.",
      lifecycleCancel: "Abbrechen",
      archiveConfirm: "Gruppe endgültig archivieren",
      reactivateConfirm: "Gruppe reaktivieren",
      archivePending: "Gruppe wird archiviert …",
      reactivatePending: "Gruppe wird reaktiviert …",
      archivalBlocked:
        "Die Gruppe kann nicht archiviert werden, weil sie für mindestens ein noch nicht begonnenes geplantes Modul ausgewählt ist.",
      lifecycleUnavailable:
        "Der Gruppenstatus kann wegen eines geänderten Administrations-, Kurs- oder Gruppenstatus nicht bearbeitet werden.",
      archived:
        "Die Gruppe wurde archiviert. Bestehende Auswahlen blieben unverändert.",
      reactivated:
        "Die Gruppe wurde reaktiviert. Zuvor entfernte Auswahlen wurden nicht wiederhergestellt.",
      deleteAction: "Gruppe löschen",
      deleteTitle: "Gruppe endgültig löschen?",
      deleteDescription:
        "Diese Aktion kann nicht rückgängig gemacht werden. Die Gruppe kann nur gelöscht werden, wenn keine aktuelle Teilnahmeauswahl mehr auf sie verweist.",
      deleteCancel: "Abbrechen",
      deleteConfirm: "Gruppe endgültig löschen",
      deletePending: "Gruppe wird gelöscht …",
      deletionBlocked:
        "Die Gruppe kann nicht gelöscht werden, weil mindestens eine aktuelle Teilnahmeauswahl auf sie verweist. Entfernen oder ändern Sie zuerst alle betreffenden Auswahlen.",
      deletionUnavailable:
        "Die Gruppe kann wegen eines geänderten Administrations-, Kurs- oder Gruppenstatus nicht gelöscht werden. Die aktuellen Kursdaten wurden neu geladen.",
      deleted: "Die Gruppe „{{name}}“ wurde endgültig gelöscht.",
    },
    module: {
      title: "Module",
      empty: "Für diesen Kurs wurden noch keine Module angelegt.",
      listLabel: "Module des Kurses",
      scheduled: "Geplant",
      state: {
        scheduled: "Geplant",
        cancelled: "Abgesagt",
      },
      noDescription: "Keine Beschreibung",
      noInstructions: "Keine Hinweise",
      createTitle: "Modul anlegen",
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
      occurrence: {
        earlier: "Erstes Vorkommen",
        later: "Zweites Vorkommen",
      },
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
    },
  },
};
