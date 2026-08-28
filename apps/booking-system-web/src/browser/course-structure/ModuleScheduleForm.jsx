import { Alert, Button, Stack, TextField, Typography } from "@mui/material";

import { ModuleScheduleChoice } from "./ModuleScheduleChoice.jsx";
import { useModuleRescheduling } from "./useModuleRescheduling.js";

/** @returns {import("react").ReactElement} Editable or explicitly locked schedule. */
export function ModuleScheduleForm({ course, module, translate }) {
  const state = useModuleRescheduling(course, module, translate);
  const titleId = `module-${module.id}-schedule-title`;

  if (!module.isScheduleEditable) {
    return (
      <Stack aria-labelledby={titleId} spacing={2}>
        <Typography component="h4" id={titleId} variant="h4">
          {translate("courseStructure.module.editScheduleTitle")}
        </Typography>
        <Alert role="status" severity="info">
          {translate("courseStructure.module.scheduleLocked")}
        </Alert>
      </Stack>
    );
  }

  return (
    <ScheduleForm
      course={course}
      module={module}
      state={state}
      titleId={titleId}
      translate={translate}
    />
  );
}

/** @returns {import("react").ReactElement} Future Module schedule form. */
function ScheduleForm({ course, module, state, titleId, translate }) {
  const errors = state.form.formState.errors;

  return (
    <Stack
      aria-label={translate("courseStructure.module.editScheduleFormLabel", {
        title: module.title,
      })}
      component="form"
      onSubmit={state.submit}
      spacing={2}
    >
      <Typography component="h4" id={titleId} variant="h4">
        {translate("courseStructure.module.editScheduleTitle")}
      </Typography>
      <Typography>
        {translate("courseStructure.module.timezoneHelp", {
          timezone: course.timezone,
        })}
      </Typography>
      <TextField
        error={Boolean(errors.startsAtLocal)}
        fullWidth
        helperText={errors.startsAtLocal?.message ?? " "}
        id={`module-${module.id}-edit-starts-at`}
        label={translate("courseStructure.module.editStartsAtLocalLabel")}
        slotProps={{ inputLabel: { shrink: true } }}
        type="datetime-local"
        {...state.form.register("startsAtLocal", {
          required: translate("courseStructure.module.startsAtRequired"),
          onChange: state.clearResolution,
        })}
      />
      <TextField
        error={Boolean(errors.endsAtLocal)}
        fullWidth
        helperText={errors.endsAtLocal?.message ?? " "}
        id={`module-${module.id}-edit-ends-at`}
        label={translate("courseStructure.module.editEndsAtLocalLabel")}
        slotProps={{ inputLabel: { shrink: true } }}
        type="datetime-local"
        {...state.form.register("endsAtLocal", {
          required: translate("courseStructure.module.endsAtRequired"),
          onChange: state.clearResolution,
        })}
      />
      <ScheduleResolution module={module} state={state} translate={translate} />
      <ScheduleResult state={state} translate={translate} />
      <ScheduleSubmit state={state} translate={translate} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Current schedule submit control. */
function ScheduleSubmit({ state, translate }) {
  const label = state.reschedule.isPending
    ? "reschedulePending"
    : "rescheduleSubmit";

  return (
    <Button
      disabled={state.reschedule.isPending || !state.hasCompleteChoices}
      type="submit"
      variant="contained"
    >
      {translate(`courseStructure.module.${label}`)}
    </Button>
  );
}

/** @returns {import("react").ReactElement | null} DST overlap resolution. */
function ScheduleResolution({ module, state, translate }) {
  if (state.disambiguation === null) return null;

  const startNeedsChoice =
    state.disambiguation.startsAt.outcome === "disambiguation-required";
  const idPrefix = `module-${module.id}-reschedule`;

  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        {translate("courseStructure.module.disambiguationRequired")}
      </Alert>
      <ModuleScheduleChoice
        field="startsAt"
        focusRef={startNeedsChoice ? state.choiceRef : undefined}
        idPrefix={idPrefix}
        onSelect={state.selectOccurrence}
        resolution={state.disambiguation.startsAt}
        selected={state.occurrences.startsAt}
        translate={translate}
      />
      <ModuleScheduleChoice
        field="endsAt"
        focusRef={startNeedsChoice ? undefined : state.choiceRef}
        idPrefix={idPrefix}
        onSelect={state.selectOccurrence}
        resolution={state.disambiguation.endsAt}
        selected={state.occurrences.endsAt}
        translate={translate}
      />
    </Stack>
  );
}

/** @returns {import("react").ReactElement | null} Focused schedule result. */
function ScheduleResult({ state, translate }) {
  if (state.hasFormLevelError) {
    return (
      <Alert ref={state.errorRef} severity="error" tabIndex={-1}>
        {translate("courseStructure.module.rescheduleUnavailable")}
      </Alert>
    );
  }

  return state.reschedule.isSuccess ? (
    <Alert ref={state.successRef} role="status" severity="success" tabIndex={-1}>
      {translate("courseStructure.module.rescheduleSuccess")}
    </Alert>
  ) : null;
}
