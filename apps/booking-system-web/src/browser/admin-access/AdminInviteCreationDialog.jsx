import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

/** @returns {import("react").ReactElement} One-time Admin Invite URL result. */
export function AdminInviteCreationDialog(props) {
  const model = useCreationDialogModel(props);

  return (
    <Dialog
      aria-describedby="admin-invite-created-description"
      aria-labelledby="admin-invite-created-title"
      disableAutoFocus
      fullWidth
      maxWidth="sm"
      onClose={props.onClose}
      open={props.url !== null}
      slotProps={{
        transition: {
          onEntered: () => model.closeRef.current?.focus(),
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <DialogTitle id="admin-invite-created-title">
        {props.translate("adminInvites.creation.title")}
      </DialogTitle>
      <CreationDialogContent {...props} {...model} />
      <DialogActions>
        <Button onClick={props.onClose} ref={model.closeRef}>
          {props.translate("adminInvites.creation.close")}
        </Button>
        <Button onClick={model.copyURL} variant="contained">
          {props.translate("adminInvites.creation.copy")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** @returns {object} Copy result and focus model for the one-time Dialog. */
function useCreationDialogModel(props) {
  const closeRef = useRef(null);
  const resultRef = useRef(null);
  const [copyOutcome, setCopyOutcome] = useState(null);

  useEffect(() => {
    setCopyOutcome(null);
  }, [props.url]);
  useEffect(() => {
    if (copyOutcome !== null) resultRef.current?.focus();
  }, [copyOutcome]);

  async function copyURL() {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopyOutcome("copied");
    } catch {
      setCopyOutcome("copyFailed");
    }
  }

  return { closeRef, copyOutcome, copyURL, resultRef };
}

/** @returns {import("react").ReactElement} Warning, URL, and copy result. */
function CreationDialogContent(props) {
  return (
    <DialogContent>
      <Stack spacing={2}>
        <DialogContentText id="admin-invite-created-description">
          {props.translate("adminInvites.creation.description")}
        </DialogContentText>
        <Alert severity="warning">
          {props.translate("adminInvites.creation.oneTimeWarning")}
        </Alert>
        <Typography
          component="code"
          sx={{ bgcolor: "action.hover", overflowWrap: "anywhere", p: 2 }}
        >
          {props.url}
        </Typography>
        {props.copyOutcome === null ? null : (
          <Alert
            ref={props.resultRef}
            role={props.copyOutcome === "copied" ? "status" : undefined}
            severity={props.copyOutcome === "copied" ? "success" : "error"}
            tabIndex={-1}
          >
            {props.translate(`adminInvites.creation.${props.copyOutcome}`)}
          </Alert>
        )}
      </Stack>
    </DialogContent>
  );
}
