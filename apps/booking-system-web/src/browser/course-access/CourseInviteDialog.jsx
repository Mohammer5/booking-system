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

/**
 * Confirm one destructive Course Invite lifecycle action.
 *
 * @param {object} props Dialog state and callbacks.
 * @returns {import("react").ReactElement} Accessible confirmation Dialog.
 */
export function CourseInviteDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);
  const isReplacement = props.action === "replacement";
  const key = isReplacement ? "replace" : "disable";

  useEffect(() => {
    if (props.error !== null) errorRef.current?.focus();
  }, [props.error]);

  return (
    <Dialog
      aria-describedby={`course-invite-${key}-description`}
      aria-labelledby={`course-invite-${key}-title`}
      disableAutoFocus
      fullWidth
      maxWidth="sm"
      onClose={props.isPending ? undefined : props.onClose}
      open={props.open}
      slotProps={{
        transition: {
          onEntered: () => cancelRef.current?.focus(),
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <DialogTitle id={`course-invite-${key}-title`}>
        {props.translate(`courseAccess.invite.${key}Title`)}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id={`course-invite-${key}-description`}>
          {props.translate(`courseAccess.invite.${key}Description`)}
        </DialogContentText>
        {props.error === null ? null : (
          <Alert ref={errorRef} severity="error" sx={{ mt: 2 }} tabIndex={-1}>
            {inviteActionError(props.error, props.translate)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          disabled={props.isPending}
          onClick={props.onClose}
          ref={cancelRef}
        >
          {props.translate("courseAccess.invite.cancel")}
        </Button>
        <Button
          color="error"
          disabled={props.isPending}
          onClick={props.onConfirm}
          variant="contained"
        >
          {props.translate(
            `courseAccess.invite.${key}${props.isPending ? "Pending" : "Confirm"}`,
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** @returns {string} Exact stale or sanitized technical failure text. */
function inviteActionError(error, translate) {
  return error.outcome === "technical-error"
    ? translate("courseAccess.invite.technicalError")
    : translate("courseAccess.invite.stale");
}
