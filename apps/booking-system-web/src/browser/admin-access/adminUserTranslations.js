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
      search: "Administrationskonten nach Name durchsuchen",
      actionColumn: "Aktion",
      editAction: "Namen bearbeiten",
      detailAction: "Details anzeigen",
      filters: {
        state: "Kontostatus",
        authority: "Berechtigung",
      },
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
    lifecycle: {
      cancel: "Abbrechen",
      disable: {
        action: "Deaktivieren",
        title: "Administrationskonto deaktivieren?",
        description:
          "Das Administrationskonto verliert sofort den Administrationszugang. Kurse, Gruppen, Module, Teilnehmende, Zuweisungen, Auswahlen und Einladungen bleiben unverändert; auch ein Teilnehmendenprofil derselben Person bleibt aktiv.",
        confirm: "Administrationskonto deaktivieren",
        pending: "Administrationskonto wird deaktiviert …",
      },
      reenable: {
        action: "Wieder aktivieren",
        title: "Administrationskonto wieder aktivieren?",
        description:
          "Der Administrationszugang wird für dieselbe Identität mit derselben Berechtigung wiederhergestellt.",
        confirm: "Administrationskonto wieder aktivieren",
        pending: "Administrationskonto wird aktiviert …",
      },
      delete: {
        action: "Löschen",
        title: "Administrationskonto dauerhaft löschen?",
        description:
          "Die aktuelle Admin-Identität wird dauerhaft gelöscht und verliert trotz bestehender Anmeldung sofort den Administrationszugang. Eine Rückkehr ist nur mit einer neuen Admin-Einladung als neue gewöhnliche Admin-Identität möglich. Kurse, Gruppen, Module, Teilnehmende, Zuweisungen, Auswahlen und Einladungen bleiben unverändert; auch ein Teilnehmendenprofil derselben Person bleibt bestehen.",
        confirm: "Administrationskonto dauerhaft löschen",
        pending: "Administrationskonto wird gelöscht …",
      },
      success: {
        disable: "{{name}} wurde deaktiviert.",
        reenable: "{{name}} wurde mit unveränderter Berechtigung wieder aktiviert.",
        delete: "{{name}} wurde als Administrationskonto gelöscht.",
      },
      restrictions: {
        selfProtected:
          "Das eigene Administrationskonto kann nicht deaktiviert oder gelöscht werden. Damit bleibt insbesondere mindestens ein aktiver Super Admin geschützt.",
        superAdminProtected:
          "Nur ein aktiver Super Admin darf den Status oder die Identität eines anderen Super Admins ändern.",
      },
      errors: {
        lastActiveSuper:
          "Die Aktion wurde abgelehnt, weil mindestens ein aktiver Super Admin erhalten bleiben muss.",
        selfProtected:
          "Das eigene Administrationskonto kann nicht deaktiviert oder gelöscht werden.",
        superAdminProtected:
          "Dieses Super-Admin-Konto darf mit Ihrer aktuellen Berechtigung nicht geändert werden.",
        stale:
          "Die Aktion ist wegen eines geänderten Status oder einer geänderten Berechtigung nicht mehr möglich. Die aktuellen Daten wurden neu geladen.",
      },
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
