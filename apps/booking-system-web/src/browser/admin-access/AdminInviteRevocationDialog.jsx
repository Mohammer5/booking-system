import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useEffect, useRef } from "react";

/** @returns {import("react").ReactElement} Terminal Admin Invite Revoke Dialog. */
export function AdminInviteRevocationDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (props.mutation.isError) errorRef.current?.focus();
  }, [props.mutation.isError]);

  return (
    <Dialog
      aria-describedby="admin-invite-revoke-description"
      aria-labelledby="admin-invite-revoke-title"
      disableAutoFocus
      fullWidth
      maxWidth="sm"
      onClose={props.mutation.isPending ? undefined : props.onClose}
      open={props.invite !== null}
      slotProps={{
        transition: {
          onEntered: () => cancelRef.current?.focus(),
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <DialogTitle id="admin-invite-revoke-title">
        {props.translate("adminInvites.revocation.title")}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="admin-invite-revoke-description">
          {props.translate("adminInvites.revocation.description")}
        </DialogContentText>
        {props.mutation.isError ? (
          <Alert ref={errorRef} severity="error" sx={{ mt: 2 }} tabIndex={-1}>
            {props.translate(revocationErrorKey(props.mutation.error))}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          disabled={props.mutation.isPending}
          onClick={props.onClose}
          ref={cancelRef}
        >
          {props.translate("adminInvites.revocation.cancel")}
        </Button>
        <Button
          color="error"
          disabled={props.mutation.isPending}
          onClick={props.onConfirm}
          variant="contained"
        >
          {props.translate(props.mutation.isPending
            ? "adminInvites.revocation.pending"
            : "adminInvites.revocation.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** @returns {string} Safe stale or technical translation key. */
function revocationErrorKey(error) {
  return error.outcome === "technical-error"
    ? "adminInvites.status.technicalError"
    : "adminInvites.revocation.stale";
}
