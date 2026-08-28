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
import { useEffect, useRef } from "react";

/**
 * Confirm permanent Group deletion and present privacy-safe refusals.
 *
 * @param {object} props Group, mutation, and callbacks.
 * @returns {import("react").ReactElement} Accessible deletion Dialog.
 */
export function GroupDeletionDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);
  const titleId = `group-${props.group.id}-deletion-title`;
  const descriptionId = `group-${props.group.id}-deletion-description`;

  useEffect(() => {
    if (props.mutation.isError) errorRef.current?.focus();
  }, [props.mutation.isError]);

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      disableAutoFocus
      disableRestoreFocus
      fullWidth
      maxWidth="sm"
      onClose={props.mutation.isPending ? undefined : props.onCancel}
      open
      slotProps={{
        transition: {
          onEntered: () => cancelRef.current?.focus(),
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <GroupDeletionDialogContent
        descriptionId={descriptionId}
        errorRef={errorRef}
        titleId={titleId}
        {...props}
      />
      <GroupDeletionDialogActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Description and focused refusal. */
function GroupDeletionDialogContent(props) {
  return (
    <>
      <DialogTitle id={props.titleId}>
        {props.translate("courseStructure.group.deleteTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id={props.descriptionId}>
            {props.translate("courseStructure.group.deleteDescription")}
          </DialogContentText>
          <Typography fontWeight={700}>{props.group.name}</Typography>
          {props.mutation.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {groupDeletionErrorMessage(
                props.mutation.error,
                props.translate,
              )}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
    </>
  );
}

/** @returns {import("react").ReactElement} Cancel and deletion controls. */
function GroupDeletionDialogActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseStructure.group.deleteCancel")}
      </Button>
      <Button
        color="error"
        disabled={props.mutation.isPending}
        onClick={props.onConfirm}
        type="button"
        variant="contained"
      >
        {props.translate(
          `courseStructure.group.${
            props.mutation.isPending ? "deletePending" : "deleteConfirm"
          }`,
        )}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Localized blocker, stale-state, or technical failure. */
function groupDeletionErrorMessage(error, translate) {
  if (error?.outcome === "group-deletion-blocked") {
    return translate("courseStructure.group.deletionBlocked");
  }

  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
    "group-not-found",
    "group-not-deletable",
    "group-not-deleted",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.group.deletionUnavailable")
    : translate("courseStructure.status.technicalError");
}
