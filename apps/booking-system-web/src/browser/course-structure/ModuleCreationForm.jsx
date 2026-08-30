import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { ModuleScheduleChoice } from "./ModuleScheduleChoice.jsx";
import {
  applyModuleFieldOutcome,
  isModuleFieldOutcome,
  moduleErrorMessage,
} from "./moduleCreationOutcomes.js";
import { useCreateModule } from "./useModules.js";

const moduleFormDefaults = {
  title: "",
  description: "",
  instructions: "",
  startsAtLocal: "",
  endsAtLocal: "",
};

/**
 * Present one future Scheduled Module creation form.
 *
 * @param {object} props Module form properties.
 * @returns {import("react").ReactElement} Module creation form.
 */
export function ModuleCreationForm({
  course,
  headingComponent = "h3",
  onSuccess,
  translate,
}) {
  const state = useModuleCreation(course, onSuccess, translate);

  return (
    <Stack
      aria-labelledby="create-module-title"
      component="form"
      onSubmit={state.submit}
      spacing={2}
    >
      <Typography component={headingComponent} id="create-module-title" variant="h3">
        {translate("courseStructure.module.createTitle")}
      </Typography>
      <Typography>
        {translate("courseStructure.module.timezoneHelp", {
          timezone: course.timezone,
        })}
      </Typography>
      <ModuleFields state={state} translate={translate} />
      <ScheduleResolution state={state} translate={translate} />
      {state.hasFormLevelError ? (
        <Alert ref={state.errorRef} severity="error" tabIndex={-1}>
          {moduleErrorMessage(state.creation.error, translate)}
        </Alert>
      ) : null}
      {state.creation.isSuccess ? (
        <Alert ref={state.successRef} role="status" severity="success" tabIndex={-1}>
          {translate("courseStructure.module.success")}
        </Alert>
      ) : null}
      <Button
        disabled={state.creation.isPending || !state.hasCompleteChoices}
        sx={{ transition: "none" }}
        type="submit"
        variant="contained"
      >
        {state.creation.isPending
          ? translate("courseStructure.module.submitting")
          : translate("courseStructure.module.submit")}
      </Button>
    </Stack>
  );
}

/**
 * Present the minimal Module descriptive and local schedule fields.
 *
 * @param {object} props Form field properties.
 * @returns {import("react").ReactElement} Module fields.
 */
function ModuleFields({ state, translate }) {
  const { errors } = state.form.formState;

  return (
    <>
      <TextField
        id="module-title"
        autoComplete="off"
        error={Boolean(errors.title)}
        fullWidth
        helperText={errors.title?.message ?? " "}
        label={translate("courseStructure.module.titleLabel")}
        {...state.form.register("title", {
          validate: (title) =>
            title.trim().length > 0 ||
            translate("courseStructure.module.titleRequired"),
        })}
      />
      <ModuleOptionalFields state={state} translate={translate} />
      <TextField
        id="module-starts-at"
        error={Boolean(errors.startsAtLocal)}
        fullWidth
        helperText={errors.startsAtLocal?.message ?? " "}
        label={translate("courseStructure.module.startsAtLocalLabel")}
        slotProps={{ inputLabel: { shrink: true } }}
        type="datetime-local"
        {...state.form.register("startsAtLocal", {
          required: translate("courseStructure.module.startsAtRequired"),
          onChange: state.clearScheduleResolution,
        })}
      />
      <TextField
        id="module-ends-at"
        error={Boolean(errors.endsAtLocal)}
        fullWidth
        helperText={errors.endsAtLocal?.message ?? " "}
        label={translate("courseStructure.module.endsAtLocalLabel")}
        slotProps={{ inputLabel: { shrink: true } }}
        type="datetime-local"
        {...state.form.register("endsAtLocal", {
          required: translate("courseStructure.module.endsAtRequired"),
          onChange: state.clearScheduleResolution,
        })}
      />
    </>
  );
}

/**
 * Present optional Module description and instructions.
 *
 * @param {object} props Optional-field properties.
 * @returns {import("react").ReactElement} Optional Module fields.
 */
function ModuleOptionalFields({ state, translate }) {
  const { errors } = state.form.formState;

  return (
    <>
      <TextField
        id="module-description"
        error={Boolean(errors.description)}
        fullWidth
        helperText={
          errors.description?.message ??
          translate("courseStructure.module.optional")
        }
        label={translate("courseStructure.module.descriptionLabel")}
        minRows={2}
        multiline
        {...state.form.register("description")}
      />
      <TextField
        id="module-instructions"
        error={Boolean(errors.instructions)}
        fullWidth
        helperText={
          errors.instructions?.message ??
          translate("courseStructure.module.optional")
        }
        label={translate("courseStructure.module.instructionsLabel")}
        minRows={2}
        multiline
        {...state.form.register("instructions")}
      />
    </>
  );
}

/**
 * Present server-resolved overlap choices and definite candidates.
 *
 * @param {object} props Resolution properties.
 * @returns {import("react").ReactElement | null} Resolution UI when required.
 */
function ScheduleResolution({ state, translate }) {
  if (state.disambiguation === null) {
    return null;
  }

  const startNeedsChoice =
    state.disambiguation.startsAt.outcome === "disambiguation-required";

  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        {translate("courseStructure.module.disambiguationRequired")}
      </Alert>
      <ModuleScheduleChoice
        field="startsAt"
        focusRef={startNeedsChoice ? state.choiceRef : undefined}
        idPrefix="create-module"
        onSelect={state.selectOccurrence}
        resolution={state.disambiguation.startsAt}
        selected={state.occurrences.startsAt}
        translate={translate}
      />
      <ModuleScheduleChoice
        field="endsAt"
        focusRef={startNeedsChoice ? undefined : state.choiceRef}
        idPrefix="create-module"
        onSelect={state.selectOccurrence}
        resolution={state.disambiguation.endsAt}
        selected={state.occurrences.endsAt}
        translate={translate}
      />
    </Stack>
  );
}

/**
 * Own Module form, disambiguation, request, and result-focus mechanics.
 *
 * @param {object} course Current Course.
 * @param {(key: string, options?: object) => string} translate Translation function.
 * @returns {object} Module form state.
 */
function useModuleCreation(course, onSuccess, translate) {
  const creation = useCreateModule(course.id);
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const choiceRef = useRef(null);
  const [disambiguation, setDisambiguation] = useState(null);
  const [occurrences, setOccurrences] = useState({});
  const form = useForm({ defaultValues: moduleFormDefaults });
  const submit = form.handleSubmit((values) =>
    submitModule({
      values,
      creation,
      form,
      occurrences,
      setDisambiguation,
      setOccurrences,
      onSuccess,
      translate,
    }),
  );
  const hasFormLevelError =
    creation.isError &&
    !isModuleFieldOutcome(creation.error?.outcome) &&
    creation.error?.outcome !== "schedule-disambiguation-required";
  const clearScheduleResolution = () => {
    creation.reset();
    setDisambiguation(null);
    setOccurrences({});
  };
  const selectOccurrence = (field, occurrence) => {
    setOccurrences((current) => ({ ...current, [field]: occurrence }));
  };
  const hasCompleteChoices = hasEveryOccurrence(disambiguation, occurrences);

  useModuleResultFocus({
    choiceRef,
    creation,
    disambiguation,
    errorRef,
    hasFormLevelError,
    successRef,
  });

  return {
    choiceRef,
    clearScheduleResolution,
    creation,
    disambiguation,
    errorRef,
    form,
    hasCompleteChoices,
    hasFormLevelError,
    occurrences,
    selectOccurrence,
    submit,
    successRef,
  };
}

/**
 * Submit one Module request and map authoritative outcomes.
 *
 * @param {object} state Submission state and operations.
 * @returns {Promise<void>} Completion after success or mapped refusal.
 */
async function submitModule(state) {
  state.creation.reset();
  state.form.clearErrors();

  try {
    const module = await state.creation.mutateAsync(
      moduleRequest(state.values, state.occurrences),
    );
    state.form.reset();
    state.setDisambiguation(null);
    state.setOccurrences({});
    state.onSuccess?.(module);
  } catch (error) {
    if (error.outcome === "schedule-disambiguation-required") {
      state.setDisambiguation(error.body.schedule);
      return;
    }

    applyModuleFieldOutcome(error, state.form, state.translate);
  }
}

/**
 * Create the narrow Module HTTP input from transient form state.
 *
 * @param {object} values Form values.
 * @param {object} occurrences Explicit overlap choices.
 * @returns {object} Module request body.
 */
function moduleRequest(values, occurrences) {
  return {
    title: values.title,
    description: values.description === "" ? null : values.description,
    instructions: values.instructions === "" ? null : values.instructions,
    startsAtLocal: values.startsAtLocal,
    startsAtOccurrence: occurrences.startsAt,
    endsAtLocal: values.endsAtLocal,
    endsAtOccurrence: occurrences.endsAt,
  };
}

/**
 * Move focus to the current Module result or first required overlap choice.
 *
 * @param {object} state Result focus state.
 * @returns {void}
 */
function useModuleResultFocus(state) {
  useEffect(() => {
    if (state.hasFormLevelError) {
      state.errorRef.current?.focus();
    }
  }, [state.errorRef, state.hasFormLevelError]);
  useEffect(() => {
    if (state.creation.isSuccess) {
      state.successRef.current?.focus();
    }
  }, [state.creation.isSuccess, state.successRef]);
  useEffect(() => {
    if (state.disambiguation !== null) {
      state.choiceRef.current?.querySelector("input")?.focus();
    }
  }, [state.choiceRef, state.disambiguation]);
}

/**
 * Determine whether every ambiguous endpoint has an occurrence choice.
 *
 * @param {object | null} schedule Current resolution.
 * @param {object} occurrences Selected occurrences.
 * @returns {boolean} Whether submission may continue.
 */
function hasEveryOccurrence(schedule, occurrences) {
  if (schedule === null) {
    return true;
  }

  return ["startsAt", "endsAt"].every(
    (field) =>
      schedule[field].outcome !== "disambiguation-required" ||
      occurrences[field] !== undefined,
  );
}
