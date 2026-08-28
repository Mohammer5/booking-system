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
import { useTranslation } from "react-i18next";

import {
  useAssignParticipant,
  useRevokeCourseAssignment,
} from "./useCourseAccess.js";

/**
 * Confirm one currently permitted retained Assignment lifecycle action.
 *
 * @param {object} props Dialog action, Assignment, Course, and callbacks.
 * @returns {import("react").ReactElement} Accessible lifecycle confirmation.
 */
export function CourseAssignmentLifecycleDialog(props) {
  const state = useLifecycleDialogState(props);

  return <LifecycleDialogSurface {...props} {...state} />;
}

/** @returns {object} Lifecycle mutation, focus, and localized state. */
function useLifecycleDialogState({ action, assignment, courseId, onSuccess }) {
  const { t } = useTranslation();
  const assignParticipant = useAssignParticipant(courseId);
  const revokeAssignment = useRevokeCourseAssignment(courseId);
  const cancelRef = useRef(null);
  const errorRef = useRef(null);
  const mutation = action === "revoke" ? revokeAssignment : assignParticipant;

  useEffect(() => {
    if (mutation.isError) {
      errorRef.current?.focus();
    }
  }, [mutation.isError]);

  const submit = async () => {
    mutation.reset();

    try {
      const result = await mutation.mutateAsync(
        action === "revoke" ? assignment.id : assignment.participant.id,
      );

      onSuccess(result);
    } catch {
      // TanStack mutation state owns the rendered language-neutral refusal.
    }
  };

  return {
    cancelRef,
    errorRef,
    focusCancel: () => cancelRef.current?.focus(),
    mutation,
    submit,
    translate: t,
  };
}

/** @returns {import("react").ReactElement} Bounded MUI confirmation surface. */
function LifecycleDialogSurface(props) {
  const titleId = `assignment-${props.action}-title`;
  const descriptionId = `assignment-${props.action}-description`;

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      disableAutoFocus
      fullWidth
      maxWidth="sm"
      onClose={props.mutation.isPending ? undefined : props.onCancel}
      open
      slotProps={{
        transition: {
          onEntered: props.focusCancel,
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <DialogTitle id={titleId}>
        {props.translate(`courseAccess.lifecycle.${props.action}Title`)}
      </DialogTitle>
      <LifecycleDialogContent descriptionId={descriptionId} {...props} />
      <LifecycleDialogActions {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Warning and refusal content. */
function LifecycleDialogContent({ descriptionId, ...props }) {
  return (
    <DialogContent>
      <Stack spacing={2}>
        <DialogContentText id={descriptionId}>
          {props.translate(`courseAccess.lifecycle.${props.action}Description`)}
        </DialogContentText>
        <Typography fontWeight={700}>{props.assignment.participant.name}</Typography>
        {props.mutation.isError ? (
          <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
            {lifecycleErrorMessage(props.mutation.error, props.translate)}
          </Alert>
        ) : null}
      </Stack>
    </DialogContent>
  );
}

/** @returns {import("react").ReactElement} Safe cancel and confirm actions. */
function LifecycleDialogActions(props) {
  const actionKey = props.mutation.isPending
    ? `${props.action}Pending`
    : `${props.action}Confirm`;

  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseAccess.lifecycle.cancel")}
      </Button>
      <Button
        color={props.action === "revoke" ? "error" : "primary"}
        disabled={props.mutation.isPending}
        onClick={props.submit}
        type="button"
        variant="contained"
      >
        {props.translate(`courseAccess.lifecycle.${actionKey}`)}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Localized current-state or technical refusal. */
function lifecycleErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-found",
    "course-not-active",
    "course-not-revocable",
    "participant-not-assignable",
    "participant-not-found",
    "assignment-not-found",
    "assignment-not-revocable",
    "assignment-not-revoked",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseAccess.lifecycle.unavailable")
    : translate("courseAccess.status.technicalError");
}
