import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

/**
 * Edit one explicit booking-system Admin User name.
 *
 * @param {object} props Current Admin, mutation, and translation.
 * @returns {import("react").ReactElement} Accessible name-only form.
 */
export function AdminUserNameForm({ adminUser, mutation, translate }) {
  const form = useForm({ defaultValues: { name: adminUser.name } });
  const resultRef = useRef(null);

  useEffect(() => {
    form.reset({ name: adminUser.name });
  }, [adminUser.name, form]);
  useMutationFocus({ form, mutation, resultRef, translate });

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
      spacing={2}
    >
      <TextField
        autoComplete="name"
        error={Boolean(form.formState.errors.name)}
        fullWidth
        helperText={form.formState.errors.name?.message ?? " "}
        label={translate("adminUsers.fields.name")}
        {...form.register("name", {
          validate: (name) => name.trim().length > 0 ||
            translate("adminUsers.form.nameRequired"),
        })}
      />
      <Typography variant="body2">
        {translate("adminUsers.form.providerNotice")}
      </Typography>
      <AdminUserNameResult
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
        {translate(mutation.isPending
          ? "adminUsers.form.submitting"
          : "adminUsers.form.submit")}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement | null} Focusable mutation result. */
function AdminUserNameResult({ mutation, resultRef, translate }) {
  if (mutation.isSuccess) {
    return (
      <Alert ref={resultRef} role="status" severity="success" tabIndex={-1}>
        {translate("adminUsers.form.success")}
      </Alert>
    );
  }

  if (!mutation.isError || mutation.error.outcome === "invalid-name") {
    return null;
  }

  return (
    <Alert ref={resultRef} severity="error" tabIndex={-1}>
      {translate(isUnavailableOutcome(mutation.error.outcome)
        ? "adminUsers.form.unavailable"
        : "adminUsers.status.technicalError")}
    </Alert>
  );
}

/** @returns {void} Focus field validation or one global mutation result. */
function useMutationFocus({ form, mutation, resultRef, translate }) {
  useEffect(() => {
    if (mutation.isSuccess) {
      resultRef.current?.focus();
      return;
    }

    if (!mutation.isError) return;
    if (mutation.error.outcome === "invalid-name") {
      form.setError("name", {
        message: translate("adminUsers.form.nameRequired"),
      });
      form.setFocus("name");
      return;
    }

    resultRef.current?.focus();
  }, [form, mutation.error, mutation.isError, mutation.isSuccess, translate]);
}

/** @returns {boolean} Whether the edit lost current Admin authority. */
function isUnavailableOutcome(outcome) {
  return new Set([
    "admin-not-active",
    "admin-user-not-editable",
    "admin-user-not-found",
    "admin-user-not-updated",
    "disabled-admin",
    "no-admin-user",
    "unauthenticated",
  ]).has(outcome);
}
