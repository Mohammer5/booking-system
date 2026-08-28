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

import {
  useDisableParticipant,
  useReenableParticipant,
} from "./useCourseAccess.js";

/**
 * Present exactly one currently applicable Participant lifecycle action.
 *
 * @param {object} props Participant and translation properties.
 * @returns {import("react").ReactElement} Lifecycle action and result.
 */
export function ParticipantLifecycleControl({ participant, translate }) {
  const action = participant.state === "active" ? "disable" : "reenable";
  const openerRef = useRef(null);
  const successRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (result !== null && !isOpen) {
      successRef.current?.focus();
    }
  }, [isOpen, result]);

  const accept = (value) => {
    setResult(value);
    setIsOpen(false);
  };

  return (
    <Stack spacing={2}>
      {result === null ? null : (
        <Alert ref={successRef} role="status" severity="success" tabIndex={-1}>
          {translate(
            `courseAccess.participantLifecycle.${result.outcome}`,
            { count: result.removedSelectionCount },
          )}
        </Alert>
      )}
      <Button
        aria-haspopup="dialog"
        color={action === "disable" ? "error" : "primary"}
        onClick={() => {
          setResult(null);
          setIsOpen(true);
        }}
        ref={openerRef}
        sx={{ alignSelf: "flex-start" }}
        variant="outlined"
      >
        {translate(`courseAccess.participantLifecycle.${action}Action`)}
      </Button>
      {isOpen ? (
        <ParticipantLifecycleDialog
          action={action}
          onCancel={() => setIsOpen(false)}
          onSuccess={accept}
          participant={participant}
          translate={translate}
        />
      ) : null}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Current lifecycle confirmation. */
function ParticipantLifecycleDialog(props) {
  const state = useParticipantLifecycleDialogState(props);
  const titleId = `participant-${props.action}-title`;
  const descriptionId = `participant-${props.action}-description`;

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      disableAutoFocus
      fullWidth
      maxWidth="sm"
      onClose={state.mutation.isPending ? undefined : props.onCancel}
      open
      slotProps={{
        transition: {
          onEntered: state.focusCancel,
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <DialogTitle id={titleId}>
        {props.translate(
          `courseAccess.participantLifecycle.${props.action}Title`,
        )}
      </DialogTitle>
      <ParticipantLifecycleDialogContent
        descriptionId={descriptionId}
        {...props}
        {...state}
      />
      <ParticipantLifecycleDialogActions {...props} {...state} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Lifecycle explanation and refusal. */
function ParticipantLifecycleDialogContent(props) {
  return (
    <DialogContent>
      <Stack spacing={2}>
        <DialogContentText id={props.descriptionId}>
          {props.translate(
            `courseAccess.participantLifecycle.${props.action}Description`,
          )}
        </DialogContentText>
        <Typography fontWeight={700}>{props.participant.name}</Typography>
        {props.mutation.isError ? (
          <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
            {participantLifecycleErrorMessage(
              props.mutation.error,
              props.translate,
            )}
          </Alert>
        ) : null}
      </Stack>
    </DialogContent>
  );
}

/** @returns {import("react").ReactElement} Safe cancel and lifecycle submit. */
function ParticipantLifecycleDialogActions(props) {
  const actionKey = `${props.action}${
    props.mutation.isPending ? "Pending" : "Confirm"
  }`;

  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
      >
        {props.translate("courseAccess.participantLifecycle.cancel")}
      </Button>
      <Button
        color={props.action === "disable" ? "error" : "primary"}
        disabled={props.mutation.isPending}
        onClick={props.submit}
        variant="contained"
      >
        {props.translate(`courseAccess.participantLifecycle.${actionKey}`)}
      </Button>
    </DialogActions>
  );
}

/** @returns {object} Mutation and focus state for one lifecycle Dialog. */
function useParticipantLifecycleDialogState({
  action,
  participant,
  onSuccess,
}) {
  const disableParticipant = useDisableParticipant(participant.id);
  const reenableParticipant = useReenableParticipant(participant.id);
  const mutation = action === "disable"
    ? disableParticipant
    : reenableParticipant;
  const cancelRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (mutation.isError) {
      errorRef.current?.focus();
    }
  }, [mutation.isError]);

  const submit = async () => {
    mutation.reset();

    try {
      onSuccess(await mutation.mutateAsync());
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
  };
}

/** @returns {string} Localized stale/unavailable or technical refusal. */
function participantLifecycleErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "participant-not-found",
    "participant-not-active",
    "participant-not-disabled",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseAccess.participantLifecycle.unavailable")
    : translate("courseAccess.status.technicalError");
}
