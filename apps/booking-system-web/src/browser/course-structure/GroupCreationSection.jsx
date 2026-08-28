import {
  Alert,
  Button,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { GroupManagementCard } from "./GroupManagementCard.jsx";
import { useCreateGroup } from "./useCourses.js";

/**
 * Present Course-wide Group state and the Active-Course creation form.
 *
 * @param {object} props Course data properties.
 * @returns {import("react").ReactElement} Group detail section.
 */
export function GroupCreationSection({ course }) {
  const { t } = useTranslation();
  const [deletionResult, setDeletionResult] = useState(null);
  const deletionSuccessRef = useRef(null);
  const deletedGroupName = deletionResult?.courseId === course.id
    ? deletionResult.groupName
    : null;

  useEffect(() => {
    if (deletedGroupName !== null) deletionSuccessRef.current?.focus();
  }, [deletedGroupName, deletionResult]);

  return (
    <Stack aria-labelledby="course-groups-title" component="section" spacing={3}>
      <Typography component="h2" id="course-groups-title" variant="h2">
        {t("courseStructure.group.title")}
      </Typography>
      {deletedGroupName === null ? null : (
        <Alert
          ref={deletionSuccessRef}
          role="status"
          severity="success"
          tabIndex={-1}
        >
          {t("courseStructure.group.deleted", { name: deletedGroupName })}
        </Alert>
      )}
      <GroupList
        courseId={course.id}
        groups={course.groups}
        onDeleted={(result) => setDeletionResult({
          courseId: course.id,
          groupName: result.group.name,
        })}
        translate={t}
      />
      <GroupCreationForm courseId={course.id} translate={t} />
    </Stack>
  );
}

/**
 * Present the empty or populated Group list.
 *
 * @param {object} props Group-list properties.
 * @returns {import("react").ReactElement} Current Group list state.
 */
function GroupList({ courseId, groups, onDeleted, translate }) {
  if (groups.length === 0) {
    return (
      <Alert role="status" severity="info">
        {translate("courseStructure.group.empty")}
      </Alert>
    );
  }

  return (
    <List
      aria-label={translate("courseStructure.group.listLabel")}
      disablePadding
    >
      {groups.map((group) => (
        <ListItem disablePadding key={group.id} sx={{ mb: 2 }}>
          <GroupManagementCard
            courseId={courseId}
            group={group}
            onDeleted={onDeleted}
            translate={translate}
          />
        </ListItem>
      ))}
    </List>
  );
}

/**
 * Present one accessible Group creation form and its outcomes.
 *
 * @param {object} props Creation form properties.
 * @returns {import("react").ReactElement} Group form.
 */
function GroupCreationForm({ courseId, translate }) {
  const state = useGroupCreation(courseId, translate);

  return (
    <Stack
      aria-labelledby="create-group-title"
      component="form"
      onSubmit={state.submit}
      spacing={2}
    >
      <Typography component="h3" id="create-group-title" variant="h3">
        {translate("courseStructure.group.createTitle")}
      </Typography>
      <TextField
        id="group-name"
        autoComplete="off"
        error={Boolean(state.form.formState.errors.name)}
        fullWidth
        helperText={state.form.formState.errors.name?.message ?? " "}
        label={translate("courseStructure.group.nameLabel")}
        {...state.form.register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            translate("courseStructure.group.nameRequired"),
        })}
      />
      <TextField
        id="group-details"
        error={Boolean(state.form.formState.errors.details)}
        fullWidth
        helperText={
          state.form.formState.errors.details?.message ??
          translate("courseStructure.group.detailsOptional")
        }
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
      {state.creation.isSuccess ? (
        <Alert ref={state.successRef} role="status" severity="success" tabIndex={-1}>
          {translate("courseStructure.group.success")}
        </Alert>
      ) : null}
      <Button
        disabled={state.creation.isPending}
        type="submit"
        variant="contained"
      >
        {state.creation.isPending
          ? translate("courseStructure.group.submitting")
          : translate("courseStructure.group.submit")}
      </Button>
    </Stack>
  );
}

/**
 * Own Group form mechanics, request mapping, and predictable result focus.
 *
 * @param {string} courseId Parent Course identity.
 * @param {(key: string) => string} translate Translation function.
 * @returns {object} Group form state.
 */
function useGroupCreation(courseId, translate) {
  const creation = useCreateGroup(courseId);
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const form = useForm({ defaultValues: { name: "", details: "" } });
  const submit = form.handleSubmit(async (values) => {
    creation.reset();
    form.clearErrors();

    try {
      await creation.mutateAsync({
        name: values.name,
        details: values.details === "" ? null : values.details,
      });
      form.reset();
    } catch (error) {
      applyGroupFieldOutcome(error, form, translate);
    }
  });
  const hasFormLevelError =
    creation.isError && !isGroupFieldOutcome(creation.error?.outcome);

  useEffect(() => {
    if (hasFormLevelError) {
      errorRef.current?.focus();
    }
  }, [hasFormLevelError]);
  useEffect(() => {
    if (creation.isSuccess) {
      successRef.current?.focus();
    }
  }, [creation.isSuccess]);

  return { creation, errorRef, form, hasFormLevelError, submit, successRef };
}

/**
 * Associate an authoritative Group field refusal with its input.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {object} form React Hook Form state.
 * @param {(key: string) => string} translate Translation function.
 * @returns {void}
 */
function applyGroupFieldOutcome(error, form, translate) {
  const detailsByOutcome = {
    "invalid-name": ["name", "courseStructure.group.nameRequired"],
    "group-name-conflict": ["name", "courseStructure.group.nameConflict"],
    "invalid-details": ["details", "courseStructure.group.detailsInvalid"],
  };
  const details = detailsByOutcome[error.outcome];

  if (details !== undefined) {
    form.setError(details[0], {
      type: "server",
      message: translate(details[1]),
    });
    form.setFocus(details[0]);
  }
}

/**
 * Identify Group outcomes rendered at a field.
 *
 * @param {string | undefined} outcome Request outcome.
 * @returns {boolean} Whether the outcome belongs to a field.
 */
function isGroupFieldOutcome(outcome) {
  return new Set([
    "invalid-name",
    "invalid-details",
    "group-name-conflict",
  ]).has(outcome);
}

/**
 * Map one form-level Group failure to German presentation.
 *
 * @param {Error} error Request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized message.
 */
function groupErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.status.unavailable")
    : translate("courseStructure.status.technicalError");
}
