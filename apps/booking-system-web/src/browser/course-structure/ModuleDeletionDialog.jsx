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

/** @returns {import("react").ReactElement} Accessible Module deletion Dialog. */
export function ModuleDeletionDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);
  const titleId = `module-${props.module.id}-deletion-dialog-title`;
  const descriptionId = `module-${props.module.id}-deletion-description`;

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
      <DeletionContent
        descriptionId={descriptionId}
        errorRef={errorRef}
        titleId={titleId}
        {...props}
      />
      <DeletionActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Permanent-action copy and error. */
function DeletionContent(props) {
  return (
    <>
      <DialogTitle id={props.titleId}>
        {props.translate("courseStructure.module.deleteTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id={props.descriptionId}>
            {props.translate("courseStructure.module.deleteDescription")}
          </DialogContentText>
          <Typography fontWeight={700}>{props.module.title}</Typography>
          {props.mutation.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {moduleDeletionErrorMessage(
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

/** @returns {import("react").ReactElement} Safe cancel and delete controls. */
function DeletionActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseStructure.module.deleteCancel")}
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
            props.mutation.isPending ? "deletePending" : "deleteConfirm"
          }`,
        )}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Localized blocker, unavailable, or technical failure. */
function moduleDeletionErrorMessage(error, translate) {
  if (error?.outcome === "module-deletion-blocked") {
    return translate("courseStructure.module.deletionBlocked");
  }

  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
    "module-not-found",
    "module-not-deletable",
    "module-not-deleted",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.module.deletionUnavailable")
    : translate("courseStructure.status.technicalError");
}
