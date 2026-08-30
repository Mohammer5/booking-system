import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { useCourseParticipantOptions } from "./useCourseAccess.js";

/** @returns {object} Local bounded-search and selection state for one Dialog. */
export function useCourseParticipantPicker(courseId) {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState(undefined);
  const [participantId, setParticipantId] = useState("");
  const [hasSelectionError, setHasSelectionError] = useState(false);
  const errorRef = useRef(null);
  const optionsRef = useRef(null);
  const searchRef = useRef(null);
  const query = useCourseParticipantOptions(courseId, q);

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

  useEffect(() => {
    if (hasSelectionError) {
      (optionsRef.current?.querySelector('input[type="radio"]:not(:disabled)')
        ?? searchRef.current)?.focus();
    }
  }, [hasSelectionError]);

  return {
    applySearch(event) {
      event.preventDefault();
      const normalized = draft.trim();

      setParticipantId("");
      setHasSelectionError(false);
      setQ(normalized.length === 0 ? undefined : normalized);
    },
    draft,
    errorRef,
    hasSelectionError,
    optionsRef,
    participantId,
    q,
    query,
    requireSelection() {
      if (participantId.length > 0) return participantId;
      setHasSelectionError(true);
      return null;
    },
    searchRef,
    setDraft,
    select(participant) {
      setParticipantId(participant.id);
      setHasSelectionError(false);
    },
  };
}

/** @returns {import("react").ReactElement} Server-searched Participant picker. */
export function CourseParticipantPicker(props) {
  const { model } = props;

  return (
    <Stack spacing={2}>
      <Stack component="form" direction={{ xs: "column", sm: "row" }}
        onSubmit={model.applySearch} spacing={1.5}>
        <TextField
          fullWidth
          inputRef={model.searchRef}
          label={props.translate("courseAccess.participantPicker.searchLabel")}
          onChange={(event) => model.setDraft(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          value={model.draft}
        />
        <Button type="submit" variant="outlined">
          {props.translate("courseAccess.participantPicker.searchAction")}
        </Button>
      </Stack>
      <PickerState {...props} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Current option query state. */
function PickerState(props) {
  const { model, translate } = props;

  if (model.query.isPending) {
    return (
      <Stack aria-live="polite" role="status" spacing={2}
        sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>{translate("courseAccess.participantPicker.loading")}</Typography>
      </Stack>
    );
  }

  if (model.query.isError) {
    return (
      <Alert ref={model.errorRef} severity="error" tabIndex={-1}>
        {translate("courseAccess.participantPicker.unavailable")}
      </Alert>
    );
  }

  if (model.query.data.participants.length === 0) {
    return (
      <Alert role="status" severity="info">
        {translate(model.q === undefined
          ? "courseAccess.participantPicker.empty"
          : "courseAccess.participantPicker.noResults")}
      </Alert>
    );
  }

  return <ParticipantOptions {...props} />;
}

/** @returns {import("react").ReactElement} At most ten explicit options. */
function ParticipantOptions({ eligible, model, translate }) {
  const errorId = "course-participant-picker-error";

  return (
    <FormControl error={model.hasSelectionError} fullWidth>
      <FormLabel id="course-participant-picker-label">
        {translate("courseAccess.participantPicker.label")}
      </FormLabel>
      <Typography color="text.secondary" variant="body2">
        {translate("courseAccess.participantPicker.resultHint")}
      </Typography>
      <RadioGroup
        aria-describedby={model.hasSelectionError ? errorId : undefined}
        aria-invalid={model.hasSelectionError || undefined}
        aria-labelledby="course-participant-picker-label"
        onChange={(event) => model.select(
          model.query.data.participants.find(({ id }) => id === event.target.value),
        )}
        ref={model.optionsRef}
        value={model.participantId}
      >
        {model.query.data.participants.map((participant) => (
          <ParticipantOption
            disabled={!eligible(participant)}
            key={participant.id}
            participant={participant}
            translate={translate}
          />
        ))}
      </RadioGroup>
      {model.hasSelectionError ? (
        <FormHelperText id={errorId}>
          {translate("courseAccess.participantPicker.required")}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}

/** @returns {import("react").ReactElement} State-explicit Participant option. */
function ParticipantOption({ disabled, participant, translate }) {
  return (
    <FormControlLabel
      control={<Radio />}
      disabled={disabled}
      label={(
        <Stack spacing={0.75} sx={{ minWidth: 0, py: 1 }}>
          <Typography fontWeight={700}>{participant.name}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">
            {participant.email}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip label={translate(
              `courseAccess.participantState.${participant.state}`,
            )} size="small" />
            <Chip label={translate(participant.assignmentState === null
              ? "courseAccess.participantPicker.noAssignment"
              : `courseAccess.assignmentState.${participant.assignmentState}`)}
            size="small" variant="outlined" />
          </Stack>
        </Stack>
      )}
      sx={{ alignItems: "flex-start", m: 0 }}
      value={participant.id}
    />
  );
}
