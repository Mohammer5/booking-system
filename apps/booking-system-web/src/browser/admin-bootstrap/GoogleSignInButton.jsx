import { useTranslation } from "react-i18next";

/**
 * Present the fixed Google authentication entry action.
 *
 * @param {object} props Component properties.
 * @param {object} props.signInMutation The Google sign-in mutation.
 * @returns {import("react").ReactElement} The sign-in action and local failure.
 */
export function GoogleSignInButton({ signInMutation }) {
  const { t } = useTranslation();

  return (
    <div>
      {signInMutation.isError ? (
        <p role="alert">{t("adminAccess.authentication.failure")}</p>
      ) : null}
      <button
        type="button"
        disabled={signInMutation.isPending}
        onClick={() => signInMutation.mutate()}
      >
        {signInMutation.isPending
          ? t("adminAccess.authentication.signingIn")
          : t("adminAccess.authentication.continueWithGoogle")}
      </button>
    </div>
  );
}
