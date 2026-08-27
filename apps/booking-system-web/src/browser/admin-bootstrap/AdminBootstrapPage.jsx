import { useTranslation } from "react-i18next";

import { AdminRegistrationForm } from "./AdminRegistrationForm.jsx";
import { AdministrationContext } from "./AdministrationContext.jsx";
import { useAdminBootstrap } from "./useAdminBootstrap.js";

/**
 * Compose the independently navigable first-Admin browser flow.
 *
 * @returns {import("react").ReactElement} The Admin route content.
 */
export function AdminBootstrapPage() {
  const { t } = useTranslation();
  const { entryQuery, currentAdminQuery, bootstrapMutation } =
    useAdminBootstrap();

  if (entryQuery.isPending) {
    return <p>{t("adminAccess.status.loading")}</p>;
  }

  if (entryQuery.isError) {
    return <p role="alert">{t("adminAccess.status.technicalError")}</p>;
  }

  if (entryQuery.data.mode === "register-admin") {
    return (
      <main>
        <h1>{t("adminAccess.bootstrap.title")}</h1>
        <p>{t("adminAccess.bootstrap.description")}</p>
        <AdminRegistrationForm bootstrapMutation={bootstrapMutation} />
      </main>
    );
  }

  return (
    <main>
      <CurrentAdministration
        currentAdminQuery={currentAdminQuery}
        hasJustBootstrapped={bootstrapMutation.isSuccess}
        translate={t}
      />
    </main>
  );
}

/**
 * Present current Admin query state for the login branch.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The current-context state.
 */
function CurrentAdministration({
  currentAdminQuery,
  hasJustBootstrapped,
  translate,
}) {
  if (currentAdminQuery.isPending) {
    return <p>{translate("adminAccess.status.loading")}</p>;
  }

  if (currentAdminQuery.isSuccess) {
    return (
      <AdministrationContext
        admin={currentAdminQuery.data}
        hasJustBootstrapped={hasJustBootstrapped}
      />
    );
  }

  return (
    <section>
      <h1>{translate("adminAccess.login.title")}</h1>
      <p role="alert">
        {currentAdminErrorMessage(currentAdminQuery.error, translate)}
      </p>
    </section>
  );
}

/**
 * Map current-Admin outcomes to German presentation.
 *
 * @param {Error} error The language-neutral remote failure.
 * @param {(key: string) => string} translate The translation function.
 * @returns {string} The localized state message.
 */
function currentAdminErrorMessage(error, translate) {
  const keysByOutcome = {
    unauthenticated: "adminAccess.login.authenticationRequired",
    "no-admin-user": "adminAccess.login.noAdminUser",
    "disabled-admin": "adminAccess.login.disabledAdmin",
  };
  const key = keysByOutcome[error.outcome];

  return translate(key ?? "adminAccess.status.technicalError");
}
