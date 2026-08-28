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
 * Confirm one Group lifecycle action and present authoritative refusals.
 *
 * @param {object} props Action, Group, mutation, and callbacks.
 * @returns {import("react").ReactElement} Accessible lifecycle Dialog.
 */
export function GroupLifecycleDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (props.mutation.isError) errorRef.current?.focus();
  }, [props.mutation.isError]);

  return (
    <Dialog
      aria-describedby={`group-${props.group.id}-${props.action}-description`}
      aria-labelledby={`group-${props.group.id}-${props.action}-title`}
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
      <GroupLifecycleDialogContent errorRef={errorRef} {...props} />
      <GroupLifecycleDialogActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Description and focused refusal. */
function GroupLifecycleDialogContent(props) {
  const titleId = `group-${props.group.id}-${props.action}-title`;
  const descriptionId =
    `group-${props.group.id}-${props.action}-description`;

  return (
    <>
      <DialogTitle id={titleId}>
        {props.translate(`courseStructure.group.${props.action}Title`)}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id={descriptionId}>
            {props.translate(
              `courseStructure.group.${props.action}Description`,
            )}
          </DialogContentText>
          <Typography fontWeight={700}>{props.group.name}</Typography>
          {props.mutation.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {groupLifecycleErrorMessage(
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

/** @returns {import("react").ReactElement} Cancel and current action controls. */
function GroupLifecycleDialogActions(props) {
  const pendingKey = `${props.action}Pending`;
  const confirmKey = `${props.action}Confirm`;

  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseStructure.group.lifecycleCancel")}
      </Button>
      <Button
        color={props.action === "archive" ? "error" : "primary"}
        disabled={props.mutation.isPending}
        onClick={props.onConfirm}
        type="button"
        variant="contained"
      >
        {props.translate(
          `courseStructure.group.${
            props.mutation.isPending ? pendingKey : confirmKey
          }`,
        )}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Localized exact blocker, stale state, or technical error. */
function groupLifecycleErrorMessage(error, translate) {
  if (error?.outcome === "group-archival-blocked") {
    return translate("courseStructure.group.archivalBlocked");
  }

  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
    "group-not-found",
    "group-not-active",
    "group-not-archived",
    "group-not-reactivated",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.group.lifecycleUnavailable")
    : translate("courseStructure.status.technicalError");
}
