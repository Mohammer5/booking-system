import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { adminBootstrapTranslations } from "./adminBootstrapTranslations.js";

/**
 * Create the German-first localization instance for the Admin slice.
 *
 * @returns {Promise<import("i18next").i18n>} The initialized instance.
 */
export async function createAdminBootstrapI18n() {
  const instance = i18next.createInstance();

  await instance.use(initReactI18next).init({
    lng: "de",
    fallbackLng: "de",
    resources: adminBootstrapTranslations,
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
