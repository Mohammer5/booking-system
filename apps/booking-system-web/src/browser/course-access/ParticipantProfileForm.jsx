import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

const completeEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/**
 * Edit one complete booking-system Participant profile.
 *
 * @param {object} props Profile, actor mode, mutation, and translation.
 * @returns {import("react").ReactElement} Accessible profile form.
 */
export function ParticipantProfileForm({
  mode,
  mutation,
  participant,
  translate,
}) {
  const form = useForm({
    defaultValues: { name: participant.name, email: participant.email },
  });
  const resultRef = useRef(null);

  useEffect(() => {
    form.reset({ name: participant.name, email: participant.email });
  }, [form, participant.email, participant.name]);
  useProfileMutationFocus({ form, mutation, resultRef, translate });

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={form.handleSubmit((profile) => mutation.mutate(profile))}
      spacing={2}
    >
      <ParticipantProfileFields form={form} translate={translate} />
      <ProfileMutationResult
        mode={mode}
        mutation={mutation}
        resultRef={resultRef}
        translate={translate}
      />
      <Button
        disabled={mutation.isPending}
        sx={{ alignSelf: "flex-start" }}
        type="submit"
        variant="contained"
      >
        {translate(
          mutation.isPending
            ? "courseAccess.profile.submitting"
            : "courseAccess.profile.submit",
        )}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Required profile fields and notice. */
function ParticipantProfileFields({ form, translate }) {
  return (
    <>
      <TextField
        autoComplete="name"
        error={Boolean(form.formState.errors.name)}
        fullWidth
        helperText={form.formState.errors.name?.message ?? " "}
        label={translate("courseAccess.profile.nameLabel")}
        {...form.register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            translate("courseAccess.profile.nameRequired"),
        })}
      />
      <TextField
        autoComplete="email"
        error={Boolean(form.formState.errors.email)}
        fullWidth
        helperText={form.formState.errors.email?.message ?? " "}
        inputMode="email"
        label={translate("courseAccess.profile.emailLabel")}
        type="email"
        {...form.register("email", {
          validate: (email) =>
            completeEmailPattern.test(email.trim()) ||
            translate("courseAccess.profile.emailInvalid"),
        })}
      />
      <Typography variant="body2">
        {translate("courseAccess.profile.providerNotice")}
      </Typography>
    </>
  );
}

/** @returns {import("react").ReactElement | null} Mutation announcement. */
function ProfileMutationResult({ mode, mutation, resultRef, translate }) {
  if (mutation.isSuccess) {
    return (
      <Alert ref={resultRef} role="status" severity="success" tabIndex={-1}>
        {translate("courseAccess.profile.success")}
      </Alert>
    );
  }

  const errorKey = profileErrorKey(mutation.error, mode);

  return errorKey === null ? null : (
    <Alert ref={resultRef} severity="error" tabIndex={-1}>
      {translate(errorKey)}
    </Alert>
  );
}

/** @returns {void} Move focus to field or global authoritative outcomes. */
function useProfileMutationFocus({ form, mutation, resultRef, translate }) {
  useEffect(() => {
    if (mutation.isSuccess) {
      resultRef.current?.focus();
      return;
    }

    if (!mutation.isError) {
      return;
    }

    if (mutation.error.outcome === "invalid-name") {
      form.setError("name", {
        message: translate("courseAccess.profile.nameRequired"),
      });
      form.setFocus("name");
      return;
    }

    if (mutation.error.outcome === "invalid-email") {
      form.setError("email", {
        message: translate("courseAccess.profile.emailInvalid"),
      });
      form.setFocus("email");
      return;
    }

    resultRef.current?.focus();
  }, [form, mutation.error, mutation.isError, mutation.isSuccess, resultRef,
    translate]);
}

/** @returns {string | null} Localized global outcome key. */
function profileErrorKey(error, mode) {
  if (error === null || ["invalid-name", "invalid-email"].includes(error.outcome)) {
    return null;
  }

  if (error.outcome === "email-already-exists") {
    return "courseAccess.profile.emailConflict";
  }

  const staleOutcomes = new Set([
    "participant-not-active",
    "participant-not-found",
    "admin-not-active",
    "disabled-admin",
    "no-admin-user",
    "unauthenticated",
  ]);

  return staleOutcomes.has(error.outcome)
    ? `courseAccess.profile.${mode}Unavailable`
    : "courseAccess.profile.technicalError";
}
