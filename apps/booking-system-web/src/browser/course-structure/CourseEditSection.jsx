import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useUpdateCourse } from "./useCourses.js";

const fixedOffsetPattern = /^[+-]\d{2}:\d{2}$/;

/**
 * Present complete Course field editing and permanent timezone-lock meaning.
 *
 * @param {object} props Current Course properties.
 * @returns {import("react").ReactElement} Stable-detail Course edit section.
 */
export function CourseEditSection({ course }) {
  const { t } = useTranslation();
  const state = useCourseEdit(course, t);

  return (
    <Stack
      aria-labelledby="course-edit-title"
      component="section"
      spacing={2}
    >
      <Typography component="h2" id="course-edit-title" variant="h2">
        {t("courseStructure.edit.title")}
      </Typography>
      <Typography>{t("courseStructure.edit.description")}</Typography>
      <Stack component="form" onSubmit={state.submit} spacing={2}>
        <CourseEditFields course={course} state={state} translate={t} />
        <CourseEditResult state={state} translate={t} />
        <Button
          disabled={state.edit.isPending}
          type="submit"
          variant="contained"
        >
          {state.edit.isPending
            ? t("courseStructure.edit.submitting")
            : t("courseStructure.edit.submit")}
        </Button>
      </Stack>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Course name, description, and timezone. */
function CourseEditFields({ course, state, translate }) {
  const { errors } = state.form.formState;

  return (
    <>
      <TextField
        id="course-edit-name"
        autoComplete="off"
        error={Boolean(errors.name)}
        fullWidth
        helperText={errors.name?.message ?? " "}
        label={translate("courseStructure.edit.nameLabel")}
        {...state.form.register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            translate("courseStructure.edit.nameRequired"),
        })}
      />
      <TextField
        id="course-edit-description"
        error={Boolean(errors.description)}
        fullWidth
        helperText={
          errors.description?.message ??
          translate("courseStructure.edit.descriptionOptional")
        }
        label={translate("courseStructure.edit.descriptionLabel")}
        minRows={3}
        multiline
        {...state.form.register("description")}
      />
      {course.isTimezoneEditable ? (
        <TextField
          id="course-edit-timezone"
          autoComplete="off"
          error={Boolean(errors.timezone)}
          fullWidth
          helperText={
            errors.timezone?.message ??
            translate("courseStructure.edit.timezoneHelp")
          }
          label={translate("courseStructure.edit.timezoneLabel")}
          {...state.form.register("timezone", {
            validate: (timezone) =>
              isIanaTimezone(timezone) ||
              translate("courseStructure.edit.timezoneInvalid"),
          })}
        />
      ) : (
        <Alert severity="info">
          {translate("courseStructure.edit.timezoneLocked", {
            timezone: course.timezone,
          })}
        </Alert>
      )}
    </>
  );
}

/** @returns {import("react").ReactElement | null} Current edit feedback. */
function CourseEditResult({ state, translate }) {
  if (state.hasFormLevelError) {
    return (
      <Alert ref={state.errorRef} severity="error" tabIndex={-1}>
        {courseEditErrorMessage(state.edit.error, translate)}
      </Alert>
    );
  }

  return state.edit.isSuccess ? (
    <Alert
      ref={state.successRef}
      role="status"
      severity="success"
      tabIndex={-1}
    >
      {translate("courseStructure.edit.success")}
    </Alert>
  ) : null;
}

/**
 * Own complete Course form values, mutation outcomes, and result focus.
 *
 * @param {object} course Current Course.
 * @param {(key: string) => string} translate Translation function.
 * @returns {object} Course edit form state.
 */
function useCourseEdit(course, translate) {
  const edit = useUpdateCourse(course.id);
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const form = useForm({ defaultValues: courseFormValues(course) });
  const hasFormLevelError =
    edit.isError && !isCourseEditFieldOutcome(edit.error?.outcome);
  const submit = form.handleSubmit(async (values) => {
    edit.reset();
    form.clearErrors();

    try {
      const updatedCourse = await edit.mutateAsync({
        name: values.name,
        description: values.description === "" ? null : values.description,
        timezone: course.isTimezoneEditable
          ? values.timezone
          : course.timezone,
      });

      form.reset(courseFormValues(updatedCourse));
    } catch (error) {
      applyCourseEditFieldOutcome(error, form, translate);
    }
  });

  useEffect(() => {
    form.reset(courseFormValues(course));
  }, [course.description, course.isTimezoneEditable, course.name, course.timezone, form]);
  useEffect(() => {
    if (hasFormLevelError) {
      errorRef.current?.focus();
    }
  }, [hasFormLevelError]);
  useEffect(() => {
    if (edit.isSuccess) {
      successRef.current?.focus();
    }
  }, [edit.isSuccess]);

  return {
    edit,
    errorRef,
    form,
    hasFormLevelError,
    submit,
    successRef,
  };
}

/** @returns {object} Complete transient form values from current Course data. */
function courseFormValues(course) {
  return {
    name: course.name,
    description: course.description ?? "",
    timezone: course.timezone,
  };
}

/** @returns {void} Associate one authoritative field refusal and focus. */
function applyCourseEditFieldOutcome(error, form, translate) {
  const detailsByOutcome = {
    "invalid-name": ["name", "nameRequired"],
    "invalid-description": ["description", "descriptionInvalid"],
    "invalid-timezone": ["timezone", "timezoneInvalid"],
  };
  const details = detailsByOutcome[error.outcome];

  if (details !== undefined) {
    form.setError(details[0], {
      type: "server",
      message: translate(`courseStructure.edit.${details[1]}`),
    });
    form.setFocus(details[0]);
  }
}

/** @returns {boolean} Whether one outcome belongs to a Course form field. */
function isCourseEditFieldOutcome(outcome) {
  return new Set([
    "invalid-name",
    "invalid-description",
    "invalid-timezone",
  ]).has(outcome);
}

/** @returns {string} Localized current-state or technical edit refusal. */
function courseEditErrorMessage(error, translate) {
  const staleOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-active",
    "course-timezone-locked",
    "course-timezone-changed",
    "course-not-updated",
  ]);

  return staleOutcomes.has(error?.outcome)
    ? translate("courseStructure.edit.unavailable")
    : translate("courseStructure.status.technicalError");
}

/** @returns {boolean} Whether the browser recognizes a named IANA timezone. */
function isIanaTimezone(timezone) {
  if (
    timezone.trim().length === 0 ||
    fixedOffsetPattern.test(timezone)
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("de", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
