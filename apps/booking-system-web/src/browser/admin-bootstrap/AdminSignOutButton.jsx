import { useTranslation } from "react-i18next";

/**
 * Present Better Auth sign-out for every authenticated Admin-route state.
 *
 * @param {object} props Component properties.
 * @param {object} props.signOutMutation The sign-out mutation.
 * @returns {import("react").ReactElement} The sign-out action and local failure.
 */
export function AdminSignOutButton({ signOutMutation }) {
  const { t } = useTranslation();

  return (
    <div>
      {signOutMutation.isError ? (
        <p role="alert">{t("adminAccess.authentication.signOutFailure")}</p>
      ) : null}
      <button
        type="button"
        disabled={signOutMutation.isPending}
        onClick={() => signOutMutation.mutate()}
      >
        {signOutMutation.isPending
          ? t("adminAccess.authentication.signingOut")
          : t("adminAccess.authentication.signOut")}
      </button>
    </div>
  );
}
