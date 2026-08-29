import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import {
  adminInviteTranslations,
  adminUserTranslations,
} from "./admin-access/index.js";
import { adminBootstrapTranslations } from "./admin-bootstrap/adminBootstrapTranslations.js";
import { applicationShellTranslations } from "./application-shell/index.js";
import { courseAccessTranslations } from "./course-access/index.js";
import { courseStructureTranslations } from "./course-structure/index.js";
import { participantEntryTranslations } from "./participant-entry/index.js";

/**
 * Compose the German-first localization instance from slice-owned resources.
 *
 * @returns {Promise<import("i18next").i18n>} The initialized instance.
 */
export async function createBrowserI18n() {
  const instance = i18next.createInstance();

  await instance.use(initReactI18next).init({
    lng: "de",
    fallbackLng: "de",
    resources: {
      de: {
        translation: {
          ...adminInviteTranslations,
          ...adminUserTranslations,
          ...adminBootstrapTranslations,
          ...applicationShellTranslations,
          ...courseAccessTranslations,
          ...courseStructureTranslations,
          ...participantEntryTranslations,
        },
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
