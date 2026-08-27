import { Alert, Button, Stack } from "@mui/material";
import { useEffect, useRef } from "react";
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
  const errorRef = useRef(null);

  useEffect(() => {
    if (signOutMutation.isError) {
      errorRef.current?.focus();
    }
  }, [signOutMutation.isError]);

  return (
    <Stack spacing={2}>
      {signOutMutation.isError ? (
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {t("adminAccess.authentication.signOutFailure")}
        </Alert>
      ) : null}
      <Button
        type="button"
        disabled={signOutMutation.isPending}
        onClick={() => signOutMutation.mutate()}
        size="large"
        variant="outlined"
      >
        {signOutMutation.isPending
          ? t("adminAccess.authentication.signingOut")
          : t("adminAccess.authentication.signOut")}
      </Button>
    </Stack>
  );
}
