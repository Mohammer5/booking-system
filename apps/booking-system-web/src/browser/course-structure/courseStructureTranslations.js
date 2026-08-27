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
  },
};
