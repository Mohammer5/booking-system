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

/** @returns {import("react").ReactElement} Accessible Course archival Dialog. */
export function CourseArchivalDialog(props) {
  const cancelRef = useRef(null);
  const resultRef = useRef(null);
  const titleId = `course-${props.course.id}-archival-dialog-title`;
  const descriptionId = `course-${props.course.id}-archival-description`;

  useEffect(() => {
    if (props.mutation.isError) resultRef.current?.focus();
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
      <CourseArchivalContent
        descriptionId={descriptionId}
        resultRef={resultRef}
        titleId={titleId}
        {...props}
      />
      <CourseArchivalActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Permanent archival copy and result. */
function CourseArchivalContent(props) {
  return (
    <>
      <DialogTitle id={props.titleId}>
        {props.translate("courseStructure.archival.dialogTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id={props.descriptionId}>
            {props.translate("courseStructure.archival.description")}
          </DialogContentText>
          <Typography fontWeight={700}>{props.course.name}</Typography>
          {!props.course.isArchivalAvailable ? (
            <Alert ref={props.resultRef} severity="warning" tabIndex={-1}>
              {props.translate("courseStructure.archival.blocked")}
            </Alert>
          ) : null}
          {props.mutation.isError ? (
            <Alert ref={props.resultRef} severity="error" tabIndex={-1}>
              {courseArchivalErrorMessage(
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

/** @returns {import("react").ReactElement} Cancel and guarded confirm actions. */
function CourseArchivalActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseStructure.archival.cancel")}
      </Button>
      <Button
        color="error"
        disabled={
          props.mutation.isPending || !props.course.isArchivalAvailable
        }
        onClick={props.onConfirm}
        type="button"
        variant="contained"
      >
        {props.translate(
          `courseStructure.archival.${
            props.mutation.isPending ? "pending" : "confirm"
          }`,
        )}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Localized blocker, unavailable, or technical failure. */
function courseArchivalErrorMessage(error, translate) {
  if (error?.outcome === "course-archival-blocked") {
    return translate("courseStructure.archival.blocked");
  }

  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-found",
    "course-not-active",
    "course-not-archivable",
    "course-not-archived",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.archival.unavailable")
    : translate("courseStructure.status.technicalError");
}
