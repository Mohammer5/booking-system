import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (signOutMutation.isError) {
      errorRef.current?.focus();
    }
  }, [signOutMutation.isError]);

  const closeDialog = () => {
    if (!signOutMutation.isPending) {
      setIsDialogOpen(false);
    }
  };
  const confirmSignOut = () => {
    signOutMutation.mutate(undefined, {
      onSettled: () => setIsDialogOpen(false),
    });
  };

  return (
    <Stack spacing={2}>
      {signOutMutation.isError ? (
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {t("adminAccess.authentication.signOutFailure")}
        </Alert>
      ) : null}
      <Button
        aria-haspopup="dialog"
        disabled={signOutMutation.isPending}
        onClick={() => setIsDialogOpen(true)}
        size="large"
        type="button"
        variant="outlined"
      >
        {t("adminAccess.authentication.signOut")}
      </Button>
      <AdminSignOutDialog
        isOpen={isDialogOpen}
        onCancel={closeDialog}
        onConfirm={confirmSignOut}
        signOutMutation={signOutMutation}
        translate={t}
      />
    </Stack>
  );
}

/**
 * Present the concrete session-ending confirmation.
 *
 * @param {object} props Dialog properties.
 * @returns {import("react").ReactElement} The sign-out dialog.
 */
function AdminSignOutDialog({
  isOpen,
  onCancel,
  onConfirm,
  signOutMutation,
  translate,
}) {
  return (
    <Dialog
      aria-describedby="admin-sign-out-description"
      aria-labelledby="admin-sign-out-title"
      onClose={onCancel}
      open={isOpen}
    >
      <DialogTitle id="admin-sign-out-title">
        {translate("adminAccess.authentication.confirmTitle")}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="admin-sign-out-description">
          {translate("adminAccess.authentication.confirmDescription")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          ref={focusCancelSignOutControl}
          disabled={signOutMutation.isPending}
          onClick={onCancel}
        >
          {translate("adminAccess.authentication.cancelSignOut")}
        </Button>
        <Button
          color="error"
          disabled={signOutMutation.isPending}
          onClick={onConfirm}
          variant="contained"
        >
          {signOutMutation.isPending
            ? translate("adminAccess.authentication.signingOut")
            : translate("adminAccess.authentication.confirmSignOut")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Focus the safe Dialog action when its portal content mounts.
 *
 * @param {HTMLButtonElement | null} node The mounted cancel control.
 * @returns {void}
 */
function focusCancelSignOutControl(node) {
  node?.focus();
}
