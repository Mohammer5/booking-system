export const adminInviteTranslations = {
  adminInvites: {
    title: "Admin-Einladungen",
    description:
      "Erstellen und widerrufen Sie einmalig verwendbare Einladungen für neue Administrationskonten.",
    listLabel: "Liste der Admin-Einladungen",
    itemLabel: "Admin-Einladung {{id}}",
    itemTitle: "Admin-Einladung",
    createdAt: "Erstellt: {{value}}",
    navigation: "Admin-Einladungen verwalten",
    state: {
      active: "Status: Aktiv",
      claimed: "Status: Eingelöst",
      revoked: "Status: Widerrufen",
    },
    creation: {
      action: "Admin-Einladung erstellen",
      pending: "Admin-Einladung wird erstellt …",
      title: "Admin-Einladung erstellt",
      description:
        "Geben Sie diesen vollständigen Link nur an die vorgesehene Person weiter.",
      oneTimeWarning:
        "Dieser Link wird nur jetzt angezeigt. Nach dem Schließen oder Neuladen kann er nicht wiederhergestellt werden.",
      copy: "Einladungslink kopieren",
      copied: "Der Einladungslink wurde kopiert.",
      copyFailed:
        "Der Einladungslink konnte nicht kopiert werden. Kopieren Sie ihn manuell, bevor Sie dieses Fenster schließen.",
      close: "Link verwerfen und schließen",
    },
    revocation: {
      action: "Admin-Einladung widerrufen",
      title: "Admin-Einladung widerrufen?",
      description:
        "Diese Einladung wird dauerhaft ungültig. Sie kann nicht wieder aktiviert oder erneut verwendet werden.",
      cancel: "Abbrechen",
      confirm: "Einladung endgültig widerrufen",
      pending: "Einladung wird widerrufen …",
      success: "Die Admin-Einladung wurde dauerhaft widerrufen.",
      stale:
        "Die Admin-Einladung oder Ihr Administrationsstatus hat sich geändert. Es wurde nichts weiter geändert.",
    },
    status: {
      loading: "Admin-Einladungen werden geladen …",
      empty: "Es wurden noch keine Admin-Einladungen erstellt.",
      unavailable:
        "Die Admin-Einladungen sind für dieses Administrationskonto nicht verfügbar.",
      technicalError:
        "Die Admin-Einladungen konnten nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
    },
  },
};
