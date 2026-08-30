import { Alert, Button, Stack, TextField } from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { useCreateGroup } from "./useGroups.js";

/** @returns {import("react").ReactElement} Validated Group creation form. */
export function GroupCreationForm({ courseId, onSuccess, translate }) {
  const state = useGroupCreation(courseId, onSuccess, translate);

  return (
    <Stack component="form" onSubmit={state.submit} spacing={2}>
      <TextField
        autoComplete="off"
        error={Boolean(state.form.formState.errors.name)}
        fullWidth
        helperText={state.form.formState.errors.name?.message ?? " "}
        label={translate("courseStructure.group.nameLabel")}
        {...state.form.register("name", {
          validate: (name) => name.trim().length > 0 ||
            translate("courseStructure.group.nameRequired"),
        })}
      />
      <TextField
        error={Boolean(state.form.formState.errors.details)}
        fullWidth
        helperText={state.form.formState.errors.details?.message ??
          translate("courseStructure.group.detailsOptional")}
        label={translate("courseStructure.group.detailsLabel")}
        minRows={2}
        multiline
        {...state.form.register("details")}
      />
      {state.hasFormLevelError ? (
        <Alert ref={state.errorRef} severity="error" tabIndex={-1}>
          {groupErrorMessage(state.creation.error, translate)}
        </Alert>
      ) : null}
      <Button disabled={state.creation.isPending} type="submit" variant="contained">
        {translate(`courseStructure.group.${
          state.creation.isPending ? "submitting" : "submit"
        }`)}
      </Button>
    </Stack>
  );
}

/** @returns {object} Form, mutation, refusal mapping, and focus state. */
function useGroupCreation(courseId, onSuccess, translate) {
  const creation = useCreateGroup(courseId);
  const errorRef = useRef(null);
  const form = useForm({ defaultValues: { name: "", details: "" } });
  const submit = form.handleSubmit(async (values) => {
    creation.reset();
    form.clearErrors();

    try {
      const group = await creation.mutateAsync({
        name: values.name,
        details: values.details === "" ? null : values.details,
      });

      onSuccess(group);
    } catch (error) {
      applyGroupFieldOutcome(error, form, translate);
    }
  });
  const hasFormLevelError = creation.isError &&
    !isGroupFieldOutcome(creation.error?.outcome);

  useEffect(() => {
    if (hasFormLevelError) errorRef.current?.focus();
  }, [hasFormLevelError]);

  return { creation, errorRef, form, hasFormLevelError, submit };
}

/** Associate one authoritative field refusal with its input. */
function applyGroupFieldOutcome(error, form, translate) {
  const detailsByOutcome = {
    "invalid-name": ["name", "nameRequired"],
    "group-name-conflict": ["name", "nameConflict"],
    "invalid-details": ["details", "detailsInvalid"],
  };
  const details = detailsByOutcome[error.outcome];

  if (details === undefined) return;
  form.setError(details[0], {
    type: "server",
    message: translate(`courseStructure.group.${details[1]}`),
  });
  form.setFocus(details[0]);
}

/** @returns {boolean} Whether one refusal belongs to a field. */
function isGroupFieldOutcome(outcome) {
  return new Set([
    "invalid-name",
    "invalid-details",
    "group-name-conflict",
  ]).has(outcome);
}

/** @returns {string} Safe unavailable or technical creation copy. */
function groupErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
  ]);

  return translate(unavailableOutcomes.has(error?.outcome)
    ? "courseStructure.status.unavailable"
    : "courseStructure.status.technicalError");
}
