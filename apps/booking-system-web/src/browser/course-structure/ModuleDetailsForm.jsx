import { Alert, Button, Stack, TextField, Typography } from "@mui/material";

import { useModuleDetailsEditing } from "./useModuleDetailsEditing.js";

/** @returns {import("react").ReactElement} Complete Module descriptive form. */
export function ModuleDetailsForm({
  courseId,
  headingComponent = "h4",
  module,
  translate,
}) {
  const state = useModuleDetailsEditing(courseId, module, translate);
  const errors = state.form.formState.errors;
  const titleId = `module-${module.id}-details-title`;

  return (
    <Stack
      aria-label={translate("courseStructure.module.editDetailsFormLabel", {
        title: module.title,
      })}
      component="form"
      onSubmit={state.submit}
      spacing={2}
    >
      <Typography component={headingComponent} id={titleId} variant="h4">
        {translate("courseStructure.module.editDetailsTitle")}
      </Typography>
      <TextField
        autoComplete="off"
        error={Boolean(errors.title)}
        fullWidth
        helperText={errors.title?.message ?? " "}
        id={`module-${module.id}-edit-title`}
        label={translate("courseStructure.module.editTitleLabel")}
        {...state.form.register("title", {
          validate: (title) =>
            title.trim().length > 0 ||
            translate("courseStructure.module.titleRequired"),
        })}
      />
      <ModuleOptionalFields
        errors={errors}
        form={state.form}
        moduleId={module.id}
        translate={translate}
      />
      <DetailsResult state={state} translate={translate} />
      <Button disabled={state.edit.isPending} type="submit" variant="contained">
        {translate(
          `courseStructure.module.${
            state.edit.isPending ? "editDetailsPending" : "editDetailsSubmit"
          }`,
        )}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Optional Module detail fields. */
function ModuleOptionalFields({ errors, form, moduleId, translate }) {
  return (
    <>
      <TextField
        error={Boolean(errors.description)}
        fullWidth
        helperText={
          errors.description?.message ?? translate("courseStructure.module.optional")
        }
        id={`module-${moduleId}-edit-description`}
        label={translate("courseStructure.module.editDescriptionLabel")}
        minRows={2}
        multiline
        {...form.register("description")}
      />
      <TextField
        error={Boolean(errors.instructions)}
        fullWidth
        helperText={
          errors.instructions?.message ?? translate("courseStructure.module.optional")
        }
        id={`module-${moduleId}-edit-instructions`}
        label={translate("courseStructure.module.editInstructionsLabel")}
        minRows={2}
        multiline
        {...form.register("instructions")}
      />
    </>
  );
}

/** @returns {import("react").ReactElement | null} Focused edit result. */
function DetailsResult({ state, translate }) {
  if (state.hasFormLevelError) {
    return (
      <Alert ref={state.errorRef} severity="error" tabIndex={-1}>
        {translate("courseStructure.module.editDetailsUnavailable")}
      </Alert>
    );
  }

  return state.edit.isSuccess ? (
    <Alert ref={state.successRef} role="status" severity="success" tabIndex={-1}>
      {translate("courseStructure.module.editDetailsSuccess")}
    </Alert>
  ) : null;
}
