import { Alert, Button, Stack, TextField } from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

const completeEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/**
 * Present mandatory explicit Participant profile onboarding.
 *
 * @param {object} props Component properties.
 * @param {object} props.registrationMutation The registration mutation.
 * @returns {import("react").ReactElement} The Participant registration form.
 */
export function ParticipantRegistrationForm({ registrationMutation }) {
  const { t } = useTranslation();
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setFocus,
  } = useForm({ defaultValues: { name: "", email: "" } });
  const mutationErrorRef = useRef(null);
  const submitProfile = handleSubmit((profile) =>
    registrationMutation.mutate(profile),
  );
  const mutationMessage = mutationErrorMessage(registrationMutation.error, t);

  useRegistrationErrorFocus({
    mutation: registrationMutation,
    mutationErrorRef,
    setError,
    setFocus,
    translate: t,
  });

  return (
    <Stack component="form" noValidate onSubmit={submitProfile} spacing={2}>
      <ParticipantProfileFields
        errors={errors}
        register={register}
        translate={t}
      />
      {mutationMessage ? (
        <Alert ref={mutationErrorRef} severity="error" tabIndex={-1}>
          {mutationMessage}
        </Alert>
      ) : null}
      <Button
        disabled={registrationMutation.isPending}
        fullWidth
        size="large"
        type="submit"
        variant="contained"
      >
        {registrationMutation.isPending
          ? t("participantEntry.onboarding.submitting")
          : t("participantEntry.onboarding.submit")}
      </Button>
    </Stack>
  );
}

/**
 * Present the two explicit booking-system profile fields.
 *
 * @param {object} props React Hook Form and translation properties.
 * @returns {import("react").ReactElement} Name and email controls.
 */
function ParticipantProfileFields({ errors, register, translate }) {
  return (
    <>
      <TextField
        id="participant-name"
        autoComplete="name"
        error={Boolean(errors.name)}
        fullWidth
        helperText={errors.name?.message ?? " "}
        label={translate("participantEntry.onboarding.nameLabel")}
        {...register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            translate("participantEntry.onboarding.nameRequired"),
        })}
      />
      <TextField
        id="participant-email"
        autoComplete="email"
        error={Boolean(errors.email)}
        fullWidth
        helperText={errors.email?.message ?? " "}
        inputMode="email"
        label={translate("participantEntry.onboarding.emailLabel")}
        type="email"
        {...register("email", {
          validate: (email) =>
            completeEmailPattern.test(email.trim()) ||
            translate("participantEntry.onboarding.emailInvalid"),
        })}
      />
    </>
  );
}

/**
 * Move focus to authoritative field errors or one global refusal.
 *
 * @param {object} options Form and mutation capabilities.
 * @returns {void}
 */
function useRegistrationErrorFocus(options) {
  useEffect(() => {
    if (!options.mutation.isError) {
      return;
    }

    if (options.mutation.error.outcome === "invalid-name") {
      options.setError("name", {
        message: options.translate("participantEntry.onboarding.nameRequired"),
      });
      options.setFocus("name");
      return;
    }

    if (options.mutation.error.outcome === "invalid-email") {
      options.setError("email", {
        message: options.translate("participantEntry.onboarding.emailInvalid"),
      });
      options.setFocus("email");
      return;
    }

    options.mutationErrorRef.current?.focus();
  }, [
    options.mutation.error,
    options.mutation.isError,
    options.mutationErrorRef,
    options.setError,
    options.setFocus,
    options.translate,
  ]);
}

/**
 * Map a language-neutral onboarding outcome to localized presentation.
 *
 * @param {Error | null} error The mutation failure.
 * @param {(key: string) => string} translate The translation function.
 * @returns {string | null} A localized global message when applicable.
 */
function mutationErrorMessage(error, translate) {
  const keysByOutcome = {
    unauthenticated: "participantEntry.authentication.required",
    "participant-already-exists": "participantEntry.onboarding.stale",
    "email-already-exists": "participantEntry.onboarding.emailConflict",
  };

  const isFieldError = ["invalid-name", "invalid-email"].includes(
    error?.outcome,
  );

  if (error === null || isFieldError) {
    return null;
  }

  return translate(
    keysByOutcome[error.outcome] ?? "participantEntry.status.technicalError",
  );
}
