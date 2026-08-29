export const adminUserTranslations = {
  adminUsers: {
    navigation: "Administrationskonten verwalten",
    toAdministration: "Zur Administration",
    fields: {
      name: "Name",
      authority: "Berechtigung",
      state: "Status",
    },
    authority: {
      admin: "Admin",
      "super-admin": "Super Admin",
    },
    state: {
      active: "Aktiv",
      disabled: "Deaktiviert",
    },
    directory: {
      title: "Administrationskonten",
      description:
        "Alle aktuellen Administrationskonten mit Berechtigung und Status.",
      tableLabel: "Verzeichnis der Administrationskonten",
      listLabel: "Liste der Administrationskonten",
      actionColumn: "Aktion",
      editAction: "Namen bearbeiten",
      detailAction: "Details anzeigen",
    },
    detail: {
      title: "Administrationskonto",
      description:
        "Prüfen Sie Berechtigung und Status und bearbeiten Sie den Namen, wenn dies erlaubt ist.",
      toDirectory: "Zurück zu den Administrationskonten",
      loading: "Administrationskonto wird geladen …",
      unavailable:
        "Dieses Administrationskonto ist nicht mehr verfügbar.",
      readOnly:
        "Sie dürfen den Namen dieses Administrationskontos nicht bearbeiten.",
    },
    form: {
      nameRequired: "Bitte geben Sie einen Namen ein.",
      providerNotice:
        "Dieser Name gehört zum Buchungssystem und wird nicht automatisch aus dem Anmeldeprofil übernommen.",
      submit: "Namen speichern",
      submitting: "Name wird gespeichert …",
      success: "Der Name des Administrationskontos wurde gespeichert.",
      unavailable:
        "Der Name kann wegen eines geänderten Administrationsstatus oder einer geänderten Berechtigung nicht bearbeitet werden.",
    },
    promotion: {
      action: "Zum Super Admin befördern",
      title: "Administrationskonto zum Super Admin befördern?",
      description:
        "Diese dauerhafte Berechtigungsänderung kann nicht rückgängig gemacht werden. Das Administrationskonto erhält sofort alle Befugnisse eines Super Admins.",
      cancel: "Abbrechen",
      confirm: "Dauerhaft befördern",
      pending: "Beförderung läuft …",
      success: "{{name}} wurde dauerhaft zum Super Admin befördert.",
      unavailable:
        "Die Beförderung ist wegen eines geänderten Status oder einer geänderten Berechtigung nicht mehr möglich.",
    },
    status: {
      loading: "Administrationskonten werden geladen …",
      empty: "Es sind keine aktuellen Administrationskonten vorhanden.",
      unavailable:
        "Die Administrationskonten sind für dieses Administrationskonto nicht verfügbar.",
      technicalError:
        "Die Administrationskonten konnten nicht geladen oder bearbeitet werden. Bitte versuchen Sie es erneut.",
    },
  },
};
