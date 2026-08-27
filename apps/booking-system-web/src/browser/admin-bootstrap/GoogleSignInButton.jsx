import { Alert, Button, Stack } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Present the fixed Google authentication entry action.
 *
 * @param {object} props Component properties.
 * @param {boolean} props.focusOnRender Whether this is the post-action target.
 * @param {object} props.signInMutation The Google sign-in mutation.
 * @returns {import("react").ReactElement} The sign-in action and local failure.
 */
export function GoogleSignInButton({ focusOnRender = false, signInMutation }) {
  const { t } = useTranslation();
  const buttonRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (signInMutation.isError) {
      errorRef.current?.focus();
    }
  }, [signInMutation.isError]);

  useEffect(() => {
    if (focusOnRender) {
      buttonRef.current?.focus();
    }
  }, [focusOnRender]);

  return (
    <Stack spacing={2}>
      {signInMutation.isError ? (
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {t("adminAccess.authentication.failure")}
        </Alert>
      ) : null}
      <Button
        ref={buttonRef}
        type="button"
        disabled={signInMutation.isPending}
        fullWidth
        onClick={() => signInMutation.mutate()}
        size="large"
        variant="contained"
      >
        {signInMutation.isPending
          ? t("adminAccess.authentication.signingIn")
          : t("adminAccess.authentication.continueWithGoogle")}
      </Button>
    </Stack>
  );
}
