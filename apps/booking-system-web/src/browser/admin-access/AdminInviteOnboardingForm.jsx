import { Alert, Button, Stack, TextField } from "@mui/material";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

/** @returns {import("react").ReactElement} Explicit invited Admin name form. */
export function AdminInviteOnboardingForm({ mutation, translate }) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm({ defaultValues: { name: "" } });
  const errorRef = useRef(null);
  const submit = handleSubmit(({ name }) => mutation.mutate(name));

  useEffect(() => {
    if (mutation.isError) errorRef.current?.focus();
  }, [mutation.isError]);

  return (
    <Stack component="form" onSubmit={submit} spacing={2}>
      <TextField
        autoComplete="name"
        autoFocus
        error={Boolean(errors.name)}
        fullWidth
        helperText={errors.name?.message ?? " "}
        label={translate("adminInviteOnboarding.name.label")}
        {...register("name", {
          validate: (name) => name.trim().length > 0 ||
            translate("adminInviteOnboarding.name.required"),
        })}
      />
      {mutation.isError ? (
        <Alert
          ref={errorRef}
          severity={mutation.error.outcome === "technical-error"
            ? "error"
            : "warning"}
          tabIndex={-1}
        >
          {translate(claimErrorKey(mutation.error.outcome))}
        </Alert>
      ) : null}
      <Button
        disabled={mutation.isPending}
        size="large"
        type="submit"
        variant="contained"
      >
        {translate(mutation.isPending
          ? "adminInviteOnboarding.name.submitting"
          : "adminInviteOnboarding.name.submit")}
      </Button>
    </Stack>
  );
}

/** @returns {string} Translation key for one safe claim failure. */
function claimErrorKey(outcome) {
  const keys = {
    "admin-user-already-exists": "adminInviteOnboarding.existing",
    "invite-unavailable": "adminInviteOnboarding.stale",
    "invalid-name": "adminInviteOnboarding.name.required",
    unauthenticated: "adminInviteOnboarding.authentication.required",
  };

  return keys[outcome] ?? "adminInviteOnboarding.technicalError";
}
