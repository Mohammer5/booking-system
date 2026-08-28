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
 * Present Better Auth sign-out for every authenticated Participant state.
 *
 * @param {object} props Component properties.
 * @param {object} props.signOutMutation The sign-out mutation.
 * @returns {import("react").ReactElement} The sign-out action and local failure.
 */
export function ParticipantSignOutButton({ signOutMutation }) {
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
          {t("participantEntry.authentication.signOutFailure")}
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
        {t("participantEntry.authentication.signOut")}
      </Button>
      <ParticipantSignOutDialog
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
function ParticipantSignOutDialog({
  isOpen,
  onCancel,
  onConfirm,
  signOutMutation,
  translate,
}) {
  return (
    <Dialog
      aria-describedby="participant-sign-out-description"
      aria-labelledby="participant-sign-out-title"
      onClose={onCancel}
      open={isOpen}
    >
      <DialogTitle id="participant-sign-out-title">
        {translate("participantEntry.authentication.confirmTitle")}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="participant-sign-out-description">
          {translate("participantEntry.authentication.confirmDescription")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          ref={focusCancelSignOutControl}
          disabled={signOutMutation.isPending}
          onClick={onCancel}
        >
          {translate("participantEntry.authentication.cancelSignOut")}
        </Button>
        <Button
          color="error"
          disabled={signOutMutation.isPending}
          onClick={onConfirm}
          variant="contained"
        >
          {signOutMutation.isPending
            ? translate("participantEntry.authentication.signingOut")
            : translate("participantEntry.authentication.confirmSignOut")}
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
