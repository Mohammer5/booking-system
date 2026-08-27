import { Alert, Button, Stack, TextField } from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

/**
 * Present the transient first-Admin name form.
 *
 * @param {object} props Component properties.
 * @param {object} props.bootstrapMutation The TanStack bootstrap mutation.
 * @returns {import("react").ReactElement} The registration form.
 */
export function AdminRegistrationForm({ bootstrapMutation }) {
  const { t } = useTranslation();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm({ defaultValues: { name: "" } });
  const submitName = handleSubmit(({ name }) => bootstrapMutation.mutate(name));
  const errorMessage = mutationErrorMessage(bootstrapMutation.error, t);
  const mutationErrorRef = useRef(null);

  useEffect(() => {
    if (bootstrapMutation.isError) {
      mutationErrorRef.current?.focus();
    }
  }, [bootstrapMutation.isError]);

  return (
    <Stack component="form" onSubmit={submitName} spacing={2}>
      <TextField
        id="admin-name"
        autoComplete="name"
        error={Boolean(errors.name)}
        fullWidth
        helperText={errors.name?.message ?? " "}
        label={t("adminAccess.bootstrap.nameLabel")}
        {...register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            t("adminAccess.bootstrap.nameRequired"),
        })}
      />
      {errorMessage ? (
        <Alert ref={mutationErrorRef} severity="error" tabIndex={-1}>
          {errorMessage}
        </Alert>
      ) : null}
      <Button
        disabled={bootstrapMutation.isPending}
        fullWidth
        size="large"
        type="submit"
        variant="contained"
      >
        {bootstrapMutation.isPending
          ? t("adminAccess.bootstrap.submitting")
          : t("adminAccess.bootstrap.submit")}
      </Button>
    </Stack>
  );
}

/**
 * Map a language-neutral bootstrap outcome to localized presentation.
 *
 * @param {Error | null} error The mutation failure.
 * @param {(key: string) => string} translate The translation function.
 * @returns {string | null} A localized message when the mutation failed.
 */
function mutationErrorMessage(error, translate) {
  if (error === null) {
    return null;
  }

  if (error.outcome === "unauthenticated") {
    return translate("adminAccess.login.authenticationRequired");
  }

  if (error.outcome === "invalid-name") {
    return translate("adminAccess.bootstrap.nameRequired");
  }

  if (error.outcome === "bootstrap-unavailable") {
    return translate("adminAccess.bootstrap.unavailable");
  }

  return translate("adminAccess.status.technicalError");
}
