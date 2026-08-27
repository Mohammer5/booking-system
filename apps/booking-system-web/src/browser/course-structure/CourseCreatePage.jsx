import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router";

import { useCreateCourse } from "./useCourses.js";

const fixedOffsetPattern = /^[+-]\d{2}:\d{2}$/;

/**
 * Present the keyboard-operable Course creation route.
 *
 * @returns {import("react").ReactElement} The Course creation form.
 */
export function CourseCreatePage() {
  const { t } = useTranslation();
  const form = useCourseCreationForm(t);

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: "48rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {t("courseStructure.create.title")}
        </Typography>
        <Typography>{t("courseStructure.create.description")}</Typography>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin/courses"
        >
          {t("courseStructure.navigation.toIndex")}
        </Button>
        <CourseForm form={form} translate={t} />
      </Stack>
    </Paper>
  );
}

/**
 * Own the transient form and successful stable-identity navigation.
 *
 * @param {(key: string) => string} translate Translation function.
 * @returns {object} Course form state and operations.
 */
function useCourseCreationForm(translate) {
  const navigate = useNavigate();
  const creation = useCreateCourse();
  const errorRef = useRef(null);
  const form = useForm({
    defaultValues: { name: "", description: "", timezone: "Europe/Berlin" },
  });
  const submitCourse = form.handleSubmit(async (values) => {
    creation.reset();

    try {
      const course = await creation.mutateAsync({
        name: values.name,
        description: values.description === "" ? null : values.description,
        timezone: values.timezone,
      });

      navigate(`/admin/courses/${course.id}`, {
        state: { courseCreated: true },
      });
    } catch (error) {
      applyFieldOutcome(error, {
        setError: form.setError,
        setFocus: form.setFocus,
        translate,
      });
    }
  });
  const hasFormLevelError =
    creation.isError && !isFieldOutcome(creation.error?.outcome);

  useEffect(() => {
    if (hasFormLevelError) {
      errorRef.current?.focus();
    }
  }, [hasFormLevelError]);

  return { creation, errorRef, form, hasFormLevelError, submitCourse };
}

/**
 * Present the Course fields and mutation state.
 *
 * @param {object} props Form presentation properties.
 * @returns {import("react").ReactElement} The Course form controls.
 */
function CourseForm({ form, translate }) {
  const { creation } = form;

  return (
    <Stack component="form" onSubmit={form.submitCourse} spacing={2}>
      <CourseFields form={form.form} translate={translate} />
      {form.hasFormLevelError ? (
        <Alert ref={form.errorRef} severity="error" tabIndex={-1}>
          {creationErrorMessage(creation.error, translate)}
        </Alert>
      ) : null}
      <Button
        disabled={creation.isPending}
        size="large"
        type="submit"
        variant="contained"
      >
        {creation.isPending
          ? translate("courseStructure.create.submitting")
          : translate("courseStructure.create.submit")}
      </Button>
    </Stack>
  );
}

/**
 * Present the three canonical Course input fields.
 *
 * @param {object} props Field presentation properties.
 * @returns {import("react").ReactElement} The Course fields.
 */
function CourseFields({ form, translate }) {
  const { errors } = form.formState;

  return (
    <>
      <TextField
        id="course-name"
        autoComplete="off"
        error={Boolean(errors.name)}
        fullWidth
        helperText={errors.name?.message ?? " "}
        label={translate("courseStructure.create.nameLabel")}
        {...form.register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            translate("courseStructure.create.nameRequired"),
        })}
      />
      <TextField
        id="course-description"
        error={Boolean(errors.description)}
        fullWidth
        helperText={
          errors.description?.message ??
          translate("courseStructure.create.descriptionOptional")
        }
        label={translate("courseStructure.create.descriptionLabel")}
        minRows={3}
        multiline
        {...form.register("description")}
      />
      <TextField
        id="course-timezone"
        autoComplete="off"
        error={Boolean(errors.timezone)}
        fullWidth
        helperText={
          errors.timezone?.message ??
          translate("courseStructure.create.timezoneHelp")
        }
        label={translate("courseStructure.create.timezoneLabel")}
        {...form.register("timezone", {
          validate: (timezone) =>
            timezone.trim().length === 0 ||
            isIanaTimezone(timezone) ||
            translate("courseStructure.create.timezoneInvalid"),
        })}
      />
    </>
  );
}

/**
 * Associate an authoritative field refusal with its browser field.
 *
 * @param {Error} error Language-neutral mutation failure.
 * @param {object} form Form error and focus capabilities.
 * @returns {void}
 */
function applyFieldOutcome(error, form) {
  const fieldByOutcome = {
    "invalid-name": "name",
    "invalid-description": "description",
    "invalid-timezone": "timezone",
  };
  const messageByOutcome = {
    "invalid-name": "courseStructure.create.nameRequired",
    "invalid-description": "courseStructure.create.descriptionInvalid",
    "invalid-timezone": "courseStructure.create.timezoneInvalid",
  };
  const field = fieldByOutcome[error.outcome];

  if (field !== undefined) {
    form.setError(field, {
      type: "server",
      message: form.translate(messageByOutcome[error.outcome]),
    });
    form.setFocus(field);
  }
}

/**
 * Identify mutation outcomes rendered at their associated field.
 *
 * @param {string | undefined} outcome Mutation outcome.
 * @returns {boolean} Whether the outcome belongs to one field.
 */
function isFieldOutcome(outcome) {
  return new Set([
    "invalid-name",
    "invalid-description",
    "invalid-timezone",
  ]).has(outcome);
}

/**
 * Map a form-level Course failure to localized presentation.
 *
 * @param {Error | null} error Language-neutral mutation failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized error copy.
 */
function creationErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseStructure.status.unavailable")
    : translate("courseStructure.status.technicalError");
}

/**
 * Validate a named timezone using the browser runtime TZDB.
 *
 * @param {string} timezone Candidate timezone identifier.
 * @returns {boolean} Whether the runtime recognizes a non-offset timezone.
 */
function isIanaTimezone(timezone) {
  if (fixedOffsetPattern.test(timezone)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("de", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
