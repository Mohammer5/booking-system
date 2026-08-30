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
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  CourseParticipantPicker,
  useCourseParticipantPicker,
} from "./CourseParticipantPicker.jsx";
import { useAssignParticipant } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Direct Assignment picker Dialog. */
export function CourseAssignmentDialog(props) {
  const model = useCourseAssignmentDialogModel(props);

  return <AssignmentDialogSurface {...props} {...model} />;
}

/** @returns {object} Picker, mutation, focus, and submission model. */
function useCourseAssignmentDialogModel(props) {
  const { t } = useTranslation();
  const assignment = useAssignParticipant(props.courseId);
  const picker = useCourseParticipantPicker(props.courseId);
  const cancelRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (assignment.error !== null) errorRef.current?.focus();
  }, [assignment.error]);

  const submit = async () => {
    assignment.reset();
    const participantId = picker.requireSelection();

    if (participantId === null) return;
    try {
      props.onSuccess(await assignment.mutateAsync(participantId));
    } catch {
      // TanStack mutation state owns the rendered refusal.
    }
  };

  return { assignment, cancelRef, errorRef, picker, submit, translate: t };
}

/** @returns {import("react").ReactElement} Bounded Assignment surface. */
function AssignmentDialogSurface(props) {
  return (
    <Dialog
      aria-describedby="course-assignment-description"
      aria-labelledby="course-assignment-title"
      disableAutoFocus
      fullWidth
      maxWidth="sm"
      onClose={props.assignment.isPending ? undefined : props.onCancel}
      open
      slotProps={{ transition: {
        onEntered: () => props.picker.searchRef.current?.focus(),
      } }}
    >
      <DialogTitle id="course-assignment-title">
        {props.translate("courseAccess.assignmentDialog.title")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id="course-assignment-description">
            {props.translate("courseAccess.assignmentDialog.description")}
          </DialogContentText>
          <CourseParticipantPicker
            eligible={() => true}
            model={props.picker}
            translate={props.translate}
          />
          {props.assignment.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {assignmentErrorMessage(
                props.assignment.error,
                props.translate,
              )}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={props.assignment.isPending} onClick={props.onCancel}
          ref={props.cancelRef}>
          {props.translate("courseAccess.assignmentDialog.cancel")}
        </Button>
        <Button disabled={!props.picker.query.isSuccess ||
          props.assignment.isPending} onClick={props.submit} variant="contained">
          {props.translate(props.assignment.isPending
            ? "courseAccess.assignmentDialog.submitting"
            : "courseAccess.assignmentDialog.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** @returns {string} Localized Assignment refusal. */
function assignmentErrorMessage(error, translate) {
  return translate(error?.outcome === "technical-error"
    ? "courseAccess.status.technicalError"
    : "courseAccess.lifecycle.unavailable");
}
