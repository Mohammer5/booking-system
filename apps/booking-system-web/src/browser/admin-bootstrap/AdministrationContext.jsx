import { useTranslation } from "react-i18next";

import { AdminSignOutButton } from "./AdminSignOutButton.jsx";

/**
 * Present the narrow current Active Admin context.
 *
 * @param {object} props Component properties.
 * @param {object} props.admin The current Admin representation.
 * @param {boolean} props.hasJustBootstrapped Whether bootstrap just succeeded.
 * @param {object} props.signOutMutation The Better Auth sign-out mutation.
 * @returns {import("react").ReactElement} The administration context.
 */
export function AdministrationContext({
  admin,
  hasJustBootstrapped,
  signOutMutation,
}) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="administration-context-title">
      {hasJustBootstrapped ? (
        <p role="status">{t("adminAccess.bootstrap.success")}</p>
      ) : null}
      <h1 id="administration-context-title">
        {t("adminAccess.context.title")}
      </h1>
      <dl>
        <dt>{t("adminAccess.context.name")}</dt>
        <dd>{admin.name}</dd>
        <dt>{t("adminAccess.context.state")}</dt>
        <dd>{t("adminAccess.context.active")}</dd>
        <dt>{t("adminAccess.context.authority")}</dt>
        <dd>
          {admin.authority === "super-admin"
            ? t("adminAccess.context.superAdmin")
            : t("adminAccess.context.admin")}
        </dd>
      </dl>
      <AdminSignOutButton signOutMutation={signOutMutation} />
    </section>
  );
}
