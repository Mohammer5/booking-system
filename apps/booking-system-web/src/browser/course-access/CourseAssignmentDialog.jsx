import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAssignParticipant,
  useParticipantDirectory,
} from "./useCourseAccess.js";

/**
 * Present and submit the concrete direct Course Assignment dialog.
 *
 * @param {object} props Dialog properties.
 * @returns {import("react").ReactElement} Assignment dialog.
 */
export function CourseAssignmentDialog(props) {
  const state = useCourseAssignmentDialog(props.courseId, props.onSuccess);

  return <AssignmentDialogSurface {...props} {...state} />;
}

/**
 * Own Participant loading, selection, mutation, and result focus.
 *
 * @param {string} courseId Stable Course identity.
 * @param {(result: object) => void} onSuccess Successful Assignment callback.
 * @returns {object} Complete Assignment dialog state.
 */
function useCourseAssignmentDialog(courseId, onSuccess) {
  const { t } = useTranslation();
  const participants = useParticipantDirectory();
  const assignment = useAssignParticipant(courseId);
  const cancelRef = useRef(null);
  const firstParticipantRef = useRef(null);
  const errorRef = useRef(null);
  const [participantId, setParticipantId] = useState("");
  const [hasSelectionError, setHasSelectionError] = useState(false);
  const [hasDialogEntered, setHasDialogEntered] = useState(false);

  useParticipantDialogFocus({
    assignment,
    cancelRef,
    errorRef,
    firstParticipantRef,
    hasDialogEntered,
    participants,
  });

  const submit = async (event) => {
    event.preventDefault();
    assignment.reset();

    if (participantId.length === 0) {
      setHasSelectionError(true);
      firstParticipantRef.current?.focus();
      return;
    }

    setHasSelectionError(false);

    try {
      onSuccess(await assignment.mutateAsync(participantId));
    } catch {
      // TanStack mutation state owns the rendered language-neutral refusal.
    }
  };
  const isSubmitDisabled =
    !participants.isSuccess ||
    participants.data.participants.length === 0 ||
    assignment.isPending;

  return {
    assignment,
    cancelRef,
    errorRef,
    firstParticipantRef,
    hasDialogEntered,
    hasSelectionError,
    isSubmitDisabled,
    markDialogEntered: () => setHasDialogEntered(true),
    participantId,
    participants,
    setParticipantId,
    submit,
    translate: t,
  };
}

/**
 * Present the bounded MUI dialog and its form regions.
 *
 * @param {object} props Complete dialog state and callbacks.
 * @returns {import("react").ReactElement} Assignment dialog surface.
 */
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
      slotProps={{
        transition: {
          onEntered: props.markDialogEntered,
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <Box component="form" onSubmit={props.submit}>
        <DialogTitle id="course-assignment-title">
          {props.translate("courseAccess.assignmentDialog.title")}
        </DialogTitle>
        <AssignmentDialogContent {...props} />
        <AssignmentDialogActions {...props} />
      </Box>
    </Dialog>
  );
}

/**
 * Present Participant choices and any mutation refusal.
 *
 * @param {object} props Complete dialog state.
 * @returns {import("react").ReactElement} Assignment dialog content.
 */
function AssignmentDialogContent(props) {
  return (
    <DialogContent>
      <DialogContentText id="course-assignment-description" sx={{ mb: 2 }}>
        {props.translate("courseAccess.assignmentDialog.description")}
      </DialogContentText>
      <ParticipantChoiceState {...props} />
      {props.assignment.isError ? (
        <Alert ref={props.errorRef} severity="error" sx={{ mt: 2 }} tabIndex={-1}>
          {assignmentErrorMessage(props.assignment.error, props.translate)}
        </Alert>
      ) : null}
    </DialogContent>
  );
}

/**
 * Present safe cancel and Assignment submit actions.
 *
 * @param {object} props Complete dialog state and cancel callback.
 * @returns {import("react").ReactElement} Assignment dialog actions.
 */
function AssignmentDialogActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.assignment.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
        type="button"
      >
        {props.translate("courseAccess.assignmentDialog.cancel")}
      </Button>
      <Button
        disabled={props.isSubmitDisabled}
        sx={{ transitionProperty: "box-shadow, border-color" }}
        type="submit"
        variant="contained"
      >
        {props.assignment.isPending
          ? props.translate("courseAccess.assignmentDialog.submitting")
          : props.translate("courseAccess.assignmentDialog.submit")}
      </Button>
    </DialogActions>
  );
}

/**
 * Own initial Dialog focus and move it to any later refusal.
 *
 * @param {object} state Query, mutation, and focus state.
 * @returns {void}
 */
function useParticipantDialogFocus(state) {
  useEffect(() => {
    if (!state.hasDialogEntered) {
      return undefined;
    }

    const focusFrameId = window.requestAnimationFrame(() => {
      if (state.assignment.isError || state.participants.isError) {
        state.errorRef.current?.focus();
        return;
      }

      if (
        state.participants.isSuccess &&
        state.firstParticipantRef.current !== null
      ) {
        state.firstParticipantRef.current.focus();
        return;
      }

      state.cancelRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrameId);
  }, [
    state.assignment.isError,
    state.cancelRef,
    state.errorRef,
    state.firstParticipantRef,
    state.hasDialogEntered,
    state.participants.isError,
    state.participants.isSuccess,
  ]);
}

/**
 * Present loading, error, empty, or selectable Participant directory state.
 *
 * @param {object} props Participant choice properties.
 * @returns {import("react").ReactElement} Current Participant choice state.
 */
function ParticipantChoiceState(props) {
  if (props.participants.isPending) {
    return (
      <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>
          {props.translate("courseAccess.assignmentDialog.loading")}
        </Typography>
      </Stack>
    );
  }

  if (props.participants.isError) {
    return (
      <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
        {assignmentErrorMessage(props.participants.error, props.translate)}
      </Alert>
    );
  }

  if (props.participants.data.participants.length === 0) {
    return (
      <Alert role="status" severity="info">
        {props.translate("courseAccess.assignmentDialog.empty")}
      </Alert>
    );
  }

  return <ParticipantChoices {...props} />;
}

/**
 * Present every registered Participant as one keyboard-selectable choice.
 *
 * @param {object} props Participant choice properties.
 * @returns {import("react").ReactElement} Participant radio group.
 */
function ParticipantChoices(props) {
  return (
    <FormControl error={props.hasSelectionError} fullWidth>
      <FormLabel id="course-assignment-participant-label">
        {props.translate("courseAccess.assignmentDialog.participantLabel")}
      </FormLabel>
      <RadioGroup
        aria-describedby={
          props.hasSelectionError
            ? "course-assignment-participant-error"
            : undefined
        }
        aria-invalid={props.hasSelectionError || undefined}
        aria-labelledby="course-assignment-participant-label"
        onChange={(event) => {
          props.setParticipantId(event.target.value);
        }}
        value={props.participantId}
      >
        {props.participants.data.participants.map((participant, index) => (
          <ParticipantChoice
            assignment={findParticipantAssignment(participant.id, props.assignments)}
            inputRef={index === 0 ? props.firstParticipantRef : undefined}
            key={participant.id}
            participant={participant}
            translate={props.translate}
          />
        ))}
      </RadioGroup>
      {props.hasSelectionError ? (
        <FormHelperText id="course-assignment-participant-error">
          {props.translate("courseAccess.assignmentDialog.selectionRequired")}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}

/**
 * Present one Participant choice with global and membership state text.
 *
 * @param {object} props Participant choice properties.
 * @returns {import("react").ReactElement} One radio choice.
 */
function ParticipantChoice({ assignment, inputRef, participant, translate }) {
  const isActive = participant.state === "active";

  return (
    <FormControlLabel
      control={<Radio slotProps={{ input: { ref: inputRef } }} />}
      label={
        <Stack spacing={0.75} sx={{ minWidth: 0, py: 1 }}>
          <Typography fontWeight={700}>{participant.name}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">
            {participant.email}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip
              color={isActive ? "success" : "default"}
              label={translate(`courseAccess.participantState.${participant.state}`)}
              size="small"
              variant={isActive ? "filled" : "outlined"}
            />
            {assignment === undefined ? null : (
              <Chip
                color={assignment.state === "active" ? "success" : "default"}
                label={translate(`courseAccess.assignmentState.${assignment.state}`)}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>
      }
      sx={{ alignItems: "flex-start", m: 0 }}
      value={participant.id}
    />
  );
}

/**
 * Resolve any retained Assignment for one Participant choice.
 *
 * @param {string} participantId Stable Participant identity.
 * @param {Array<object>} assignments Current Course Assignments.
 * @returns {object | undefined} Matching Assignment when present.
 */
function findParticipantAssignment(participantId, assignments) {
  return assignments.find(
    (assignment) => assignment.participant.id === participantId,
  );
}

/**
 * Map one Assignment refusal to localized presentation.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized refusal copy.
 */
function assignmentErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "assignment-not-created",
    "course-not-active",
    "course-not-found",
    "participant-not-assignable",
    "participant-not-found",
    "assignment-not-active",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseAccess.status.unavailable")
    : translate("courseAccess.status.technicalError");
}
