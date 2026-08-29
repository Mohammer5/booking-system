import {
  Alert,
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
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useParticipantDirectory } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Private target Participant picker. */
export function AdminParticipationParticipantDialog({
  courseId,
  onClose,
  participations,
  translate,
}) {
  const participants = useParticipantDirectory();
  const navigate = useNavigate();
  const cancelRef = useRef(null);
  const firstActiveRef = useRef(null);
  const [participantId, setParticipantId] = useState("");
  const [hasError, setHasError] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (participantId.length === 0) {
      setHasError(true);
      firstActiveRef.current?.focus();
      return;
    }

    onClose();
    navigate(`/admin/courses/${courseId}/participation/${participantId}`);
  };

  return (
    <Dialog
      aria-describedby="participation-target-description"
      aria-labelledby="participation-target-title"
      fullWidth maxWidth="sm"
      onClose={onClose}
      open
      slotProps={{
        transition: { onEntered: () => cancelRef.current?.focus() },
      }}
    >
      <Stack component="form" onSubmit={submit}>
        <DialogTitle id="participation-target-title">
          {translate("courseAccess.adminParticipation.target.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="participation-target-description" sx={{ mb: 2 }}>
            {translate("courseAccess.adminParticipation.target.description")}
          </DialogContentText>
          <TargetState
            firstActiveRef={firstActiveRef}
            hasError={hasError}
            participantId={participantId}
            participants={participants}
            participations={participations}
            setParticipantId={setParticipantId}
            translate={translate}
          />
        </DialogContent>
        <TargetActions cancelRef={cancelRef} onClose={onClose}
          participants={participants} translate={translate} />
      </Stack>
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Safe target Dialog actions. */
function TargetActions({ cancelRef, onClose, participants, translate }) {
  const hasActiveTarget = participants.isSuccess &&
    participants.data.participants.some(({ state }) => state === "active");

  return (
    <DialogActions>
      <Button onClick={onClose} ref={cancelRef} type="button">
        {translate("courseAccess.adminParticipation.target.cancel")}
      </Button>
      <Button disabled={!hasActiveTarget} type="submit" variant="contained">
        {translate("courseAccess.adminParticipation.target.open")}
      </Button>
    </DialogActions>
  );
}

/** @returns {import("react").ReactElement} Target loading/refusal/choices. */
function TargetState(props) {
  if (props.participants.isPending) {
    return (
      <Stack aria-live="polite" role="status" spacing={2}
        sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>
          {props.translate("courseAccess.adminParticipation.target.loading")}
        </Typography>
      </Stack>
    );
  }

  if (props.participants.isError) {
    return (
      <Alert severity="error">
        {props.translate("courseAccess.adminParticipation.target.unavailable")}
      </Alert>
    );
  }
  if (props.participants.data.participants.length === 0) {
    return (
      <Alert severity="info">
        {props.translate("courseAccess.adminParticipation.target.empty")}
      </Alert>
    );
  }

  return <TargetChoices {...props} />;
}

/** @returns {import("react").ReactElement} Registered target radio choices. */
function TargetChoices(props) {
  const firstActiveId = props.participants.data.participants.find(
    ({ state }) => state === "active",
  )?.id;

  return (
    <FormControl error={props.hasError} fullWidth>
      <FormLabel id="participation-target-label">
        {props.translate("courseAccess.adminParticipation.target.label")}
      </FormLabel>
      <RadioGroup
        aria-describedby={props.hasError ? "participation-target-error" : undefined}
        aria-labelledby="participation-target-label"
        onChange={(event) => {
          props.setParticipantId(event.target.value);
        }}
        value={props.participantId}
      >
        {props.participants.data.participants.map((participant) => (
          <TargetChoice
            assignment={props.participations.find(
              ({ participant: current }) => current.id === participant.id,
            )?.assignment}
            inputRef={participant.id === firstActiveId
              ? props.firstActiveRef
              : undefined}
            key={participant.id}
            participant={participant}
            translate={props.translate}
          />
        ))}
      </RadioGroup>
      {props.hasError ? (
        <FormHelperText id="participation-target-error">
          {props.translate("courseAccess.adminParticipation.target.required")}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}

/** @returns {import("react").ReactElement} One state-explicit target choice. */
function TargetChoice({ assignment, inputRef, participant, translate }) {
  const isActive = participant.state === "active";

  return (
    <FormControlLabel
      control={<Radio slotProps={{ input: { ref: inputRef } }} />}
      disabled={!isActive}
      label={
        <Stack spacing={0.75} sx={{ minWidth: 0, py: 1 }}>
          <Typography fontWeight={700}>{participant.name}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">
            {participant.email}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip
              label={translate(`courseAccess.participantState.${participant.state}`)}
              size="small"
              variant={isActive ? "filled" : "outlined"}
            />
            <Chip
              label={translate(
                assignment === undefined
                  ? "courseAccess.adminParticipation.target.noAssignment"
                  : `courseAccess.assignmentState.${assignment.state}`,
              )}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Stack>
      }
      sx={{ alignItems: "flex-start", m: 0 }}
      value={participant.id}
    />
  );
}
