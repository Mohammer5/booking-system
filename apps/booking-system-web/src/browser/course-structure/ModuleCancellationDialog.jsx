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

/** @returns {import("react").ReactElement} Accessible Module cancellation Dialog. */
export function ModuleCancellationDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);
  const titleId = `module-${props.module.id}-cancellation-dialog-title`;
  const descriptionId = `module-${props.module.id}-cancellation-description`;

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
      <CancellationContent
        descriptionId={descriptionId}
        errorRef={errorRef}
        titleId={titleId}
        {...props}
      />
      <CancellationActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Description and focused refusal. */
function CancellationContent(props) {
  return (
    <>
      <DialogTitle id={props.titleId}>
        {props.translate("courseStructure.module.cancelDialogTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id={props.descriptionId}>
            {props.translate("courseStructure.module.cancelDescription")}
          </DialogContentText>
          <Typography fontWeight={700}>{props.module.title}</Typography>
          {props.mutation.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {cancellationErrorMessage(props.mutation.error, props.translate)}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
    </>
  );
}

/** @returns {import("react").ReactElement} Safe cancel and confirm actions. */
function CancellationActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseStructure.module.cancelDialogCancel")}
      </Button>
      <Button
        color="error"
        disabled={props.mutation.isPending}
        onClick={props.onConfirm}
        type="button"
        variant="contained"
      >
        {props.translate(
          `courseStructure.module.${
            props.mutation.isPending ? "cancelPending" : "cancelConfirm"
          }`,
        )}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Localized deadline, stale-state, or technical failure. */
function cancellationErrorMessage(error, translate) {
  if (error?.outcome === "module-cancellation-deadline-reached") {
    return translate("courseStructure.module.cancellationDeadlineReached");
  }

  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
    "module-not-found",
    "module-not-cancellable",
    "module-not-scheduled",
    "module-not-cancelled",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.module.cancellationUnavailable")
    : translate("courseStructure.status.technicalError");
}
