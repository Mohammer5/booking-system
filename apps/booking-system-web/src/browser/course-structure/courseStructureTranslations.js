export const courseStructureTranslations = {
  courseStructure: {
    navigation: {
      toAdministration: "Zur Administration",
      toIndex: "Zur Kursübersicht",
    },
    state: {
      active: "Aktiv",
    },
    status: {
      unavailable:
        "Die Kursverwaltung ist für dieses Administrationskonto nicht verfügbar.",
      technicalError:
        "Die Kursdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    },
    index: {
      title: "Kurse",
      create: "Kurs anlegen",
      loading: "Kurse werden geladen …",
      empty: "Es wurden noch keine Kurse angelegt.",
      listLabel: "Kursliste",
      open: "Kurs öffnen",
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
    group: {
      title: "Gruppen",
      empty: "Für diesen Kurs wurden noch keine Gruppen angelegt.",
      listLabel: "Gruppen des Kurses",
      noDetails: "Keine weiteren Angaben",
      createTitle: "Gruppe anlegen",
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
    },
    module: {
      title: "Module",
      empty: "Für diesen Kurs wurden noch keine Module angelegt.",
      listLabel: "Module des Kurses",
      scheduled: "Geplant",
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
    },
  },
};
