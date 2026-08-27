import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { AdminRegistrationForm } from "./AdminRegistrationForm.jsx";
import { AdminSignOutButton } from "./AdminSignOutButton.jsx";
import { AdministrationContext } from "./AdministrationContext.jsx";
import { GoogleSignInButton } from "./GoogleSignInButton.jsx";
import { useAdminBootstrap } from "./useAdminBootstrap.js";

/**
 * Compose the independently navigable first-Admin browser flow.
 *
 * @returns {import("react").ReactElement} The Admin route content.
 */
export function AdminBootstrapPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const adminFlow = useAdminBootstrap();
  const isAuthenticationFailure =
    searchParams.get("authentication") === "failed";

  if (adminFlow.entryQuery.isPending || adminFlow.currentAdminQuery.isPending) {
    return <p>{t("adminAccess.status.loading")}</p>;
  }

  if (
    adminFlow.entryQuery.isError ||
    isTechnicalCurrentAdminError(adminFlow.currentAdminQuery)
  ) {
    return <p role="alert">{t("adminAccess.status.technicalError")}</p>;
  }

  return (
    <main>
      {isAuthenticationFailure ? (
        <p role="alert">{t("adminAccess.authentication.failure")}</p>
      ) : null}
      {adminFlow.entryQuery.data.mode === "register-admin" ? (
        <FirstAdminEntry adminFlow={adminFlow} translate={t} />
      ) : (
        <CurrentAdministration adminFlow={adminFlow} translate={t} />
      )}
    </main>
  );
}

/**
 * Present first-Admin authentication before the booking-system name form.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The current-context state.
 */
function FirstAdminEntry({ adminFlow, translate }) {
  if (adminFlow.currentAdminQuery.isSuccess) {
    return <ActiveAdministration adminFlow={adminFlow} />;
  }

  if (adminFlow.currentAdminQuery.error.outcome === "unauthenticated") {
    return (
      <section>
        <h1>{translate("adminAccess.bootstrap.title")}</h1>
        <p>{translate("adminAccess.bootstrap.authenticationDescription")}</p>
        <GoogleSignInButton signInMutation={adminFlow.signInMutation} />
      </section>
    );
  }

  if (adminFlow.currentAdminQuery.error.outcome === "no-admin-user") {
    return (
      <section>
        <h1>{translate("adminAccess.bootstrap.title")}</h1>
        <p>{translate("adminAccess.bootstrap.nameDescription")}</p>
        <AdminRegistrationForm
          bootstrapMutation={adminFlow.bootstrapMutation}
        />
        <AdminSignOutButton signOutMutation={adminFlow.signOutMutation} />
      </section>
    );
  }

  return <RefusedAdministration adminFlow={adminFlow} translate={translate} />;
}

/**
 * Present current Admin query state after bootstrap has been consumed.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The current-context state.
 */
function CurrentAdministration({ adminFlow, translate }) {
  if (adminFlow.currentAdminQuery.isSuccess) {
    return <ActiveAdministration adminFlow={adminFlow} />;
  }

  if (adminFlow.currentAdminQuery.error.outcome === "unauthenticated") {
    return (
      <section>
        <h1>{translate("adminAccess.login.title")}</h1>
        <p>{translate("adminAccess.login.authenticationRequired")}</p>
        <GoogleSignInButton signInMutation={adminFlow.signInMutation} />
      </section>
    );
  }

  return <RefusedAdministration adminFlow={adminFlow} translate={translate} />;
}

/**
 * Present an authenticated Active Admin and session recovery action.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The Active administration state.
 */
function ActiveAdministration({ adminFlow }) {
  return (
    <AdministrationContext
      admin={adminFlow.currentAdminQuery.data}
      hasJustBootstrapped={adminFlow.bootstrapMutation.isSuccess}
      signOutMutation={adminFlow.signOutMutation}
    />
  );
}

/**
 * Present an authenticated but unauthorized Admin context with sign-out.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The refused administration state.
 */
function RefusedAdministration({ adminFlow, translate }) {
  return (
    <section>
      <h1>{translate("adminAccess.login.title")}</h1>
      <p role="alert">
        {currentAdminErrorMessage(adminFlow.currentAdminQuery.error, translate)}
      </p>
      <AdminSignOutButton signOutMutation={adminFlow.signOutMutation} />
    </section>
  );
}

/**
 * Distinguish expected language-neutral Admin refusals from technical errors.
 *
 * @param {object} currentAdminQuery The authoritative current-Admin query.
 * @returns {boolean} Whether the query failed for a technical reason.
 */
function isTechnicalCurrentAdminError(currentAdminQuery) {
  const expectedOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
  ]);

  return (
    currentAdminQuery.isError &&
    !expectedOutcomes.has(currentAdminQuery.error.outcome)
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
