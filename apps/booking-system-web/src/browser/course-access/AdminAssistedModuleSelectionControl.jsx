import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  useRemoveParticipantModuleSelectionAsAdmin,
  useSetParticipantModuleSelectionAsAdmin,
} from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} One Admin-assisted Module control. */
export function AdminAssistedModuleSelectionControl({
  assignment,
  courseId,
  groups,
  module,
  participantId,
  selection,
  translate,
}) {
  const state = useAssistedSelectionState({ courseId, module, participantId,
    selection });
  const activeGroups = groups.filter(({ state: groupState }) =>
    groupState === "active");

  return (
    <Stack spacing={2}>
      <Typography component="h4" variant="h4">
        {translate("courseAccess.adminParticipation.assisted.title")}
      </Typography>
      <AssignmentConsequence assignment={assignment} translate={translate} />
      {module.selectionAvailability === "open" ? (
        <SelectionForm
          activeGroups={activeGroups}
          form={state.form}
          moduleId={module.id}
          mutation={state.setMutation}
          onSubmit={state.form.handleSubmit(({ groupId }) => {
            state.removeMutation.reset();
            state.setMutation.mutate(groupId);
          })}
          translate={translate}
        />
      ) : (
        <Alert severity="info">
          {translate("courseAccess.adminParticipation.assisted.locked")}
        </Alert>
      )}
      <MutationResult state={state} translate={translate} />
      {selection === undefined || module.selectionAvailability !== "open" ? null : (
        <Button
          color="error"
          onClick={() => state.setIsRemoveOpen(true)}
          sx={{ alignSelf: "flex-start" }}
          variant="outlined"
        >
          {translate("courseAccess.adminParticipation.assisted.remove")}
        </Button>
      )}
      <RemovalDialog
        cancelRef={state.cancelRef}
        isOpen={state.isRemoveOpen}
        mutation={state.removeMutation}
        onClose={() => state.setIsRemoveOpen(false)}
        onConfirm={state.confirmRemoval}
        translate={translate}
      />
    </Stack>
  );
}

/** @returns {object} Form, mutations, Dialog, and result focus state. */
function useAssistedSelectionState({ courseId, module, participantId, selection }) {
  const setMutation = useSetParticipantModuleSelectionAsAdmin(
    courseId,
    participantId,
    module.id,
  );
  const removeMutation = useRemoveParticipantModuleSelectionAsAdmin(
    courseId,
    participantId,
    module.id,
  );
  const resultRef = useRef(null);
  const cancelRef = useRef(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const form = useForm({
    defaultValues: { groupId: selection?.group.id ?? "" },
  });

  useEffect(() => {
    form.reset({ groupId: selection?.group.id ?? "" });
  }, [form, selection?.group.id]);
  useEffect(() => {
    const hasSetResult = setMutation.isSuccess || setMutation.isError;
    const hasClosedRemovalResult =
      !isRemoveOpen && (removeMutation.isSuccess || removeMutation.isError);

    if (hasSetResult || hasClosedRemovalResult) resultRef.current?.focus();
  }, [
    isRemoveOpen,
    removeMutation.isError,
    removeMutation.isSuccess,
    setMutation.isError,
    setMutation.isSuccess,
  ]);

  return {
    cancelRef,
    confirmRemoval: () => {
      setMutation.reset();
      removeMutation.mutate(undefined, {
        onSettled: () => setIsRemoveOpen(false),
      });
    },
    form,
    isRemoveOpen,
    removeMutation,
    resultRef,
    setIsRemoveOpen,
    setMutation,
  };
}

/** @returns {import("react").ReactElement} Exact membership consequence copy. */
function AssignmentConsequence({ assignment, translate }) {
  const consequence = assignment === null
    ? "created"
    : assignment.state === "revoked"
      ? "reactivated"
      : "unchanged";

  return (
    <Alert severity="info">
      <Typography fontWeight={700}>
        {translate(
          `courseAccess.adminParticipation.assisted.assignment.${consequence}`,
        )}
      </Typography>
      {translate("courseAccess.adminParticipation.assisted.assignmentMeaning")}
    </Alert>
  );
}

/** @returns {import("react").ReactElement} Explicit eligible Group choice. */
function SelectionForm({
  activeGroups,
  form,
  moduleId,
  mutation,
  onSubmit,
  translate,
}) {
  const labelId = `admin-assisted-group-${moduleId}`;

  return (
    <Stack component="form" noValidate onSubmit={onSubmit} spacing={2}>
      <Controller
        control={form.control}
        name="groupId"
        render={({ field, fieldState }) => (
          <FormControl error={fieldState.invalid} required>
            <FormLabel id={labelId}>
              {translate("courseAccess.adminParticipation.assisted.groupLabel")}
            </FormLabel>
            <RadioGroup {...field} aria-labelledby={labelId}>
              {activeGroups.map((group) => (
                <FormControlLabel
                  control={<Radio />}
                  key={group.id}
                  label={group.name}
                  value={group.id}
                />
              ))}
            </RadioGroup>
            {fieldState.error === undefined ? null : (
              <FormHelperText>{fieldState.error.message}</FormHelperText>
            )}
          </FormControl>
        )}
        rules={{
          required: translate(
            "courseAccess.adminParticipation.assisted.required",
          ),
        }}
      />
      {activeGroups.length === 0 ? (
        <Alert severity="warning">
          {translate("courseAccess.adminParticipation.assisted.noGroups")}
        </Alert>
      ) : null}
      <Button
        disabled={mutation.isPending || activeGroups.length === 0}
        sx={{ alignSelf: "flex-start" }}
        type="submit"
        variant="contained"
      >
        {translate(
          mutation.isPending
            ? "courseAccess.adminParticipation.assisted.saving"
            : "courseAccess.adminParticipation.assisted.save",
        )}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement | null} Focusable mutation result. */
function MutationResult({ state, translate }) {
  const result = state.setMutation.data ?? state.removeMutation.data;
  const error = state.setMutation.error ?? state.removeMutation.error;

  if (error !== null) {
    return (
      <Alert ref={state.resultRef} severity="error" tabIndex={-1}>
        {translate(assistedErrorKey(error))}
      </Alert>
    );
  }

  return result === undefined ? null : (
    <Alert ref={state.resultRef} role="status" severity="success" tabIndex={-1}>
      {translate(
        `courseAccess.adminParticipation.assisted.result.${result.outcome}`,
      )}
      {result.assignmentOutcome === undefined ? null : ` ${translate(
        `courseAccess.adminParticipation.assisted.assignmentResult.${
          result.assignmentOutcome
        }`,
      )}`}
    </Alert>
  );
}

/** @returns {string} Localized error key for one language-neutral outcome. */
function assistedErrorKey(error) {
  if (error?.outcome === "technical-error") {
    return "courseAccess.adminParticipation.assisted.technicalError";
  }

  if (error?.outcome === "invalid-group-id") {
    return "courseAccess.adminParticipation.assisted.validationError";
  }

  return new Set([
    "admin-not-active",
    "participant-not-active",
    "course-not-active",
    "module-not-selectable",
    "selection-deadline-reached",
    "group-not-selectable",
  ]).has(error?.outcome)
    ? "courseAccess.adminParticipation.assisted.stale"
    : "courseAccess.adminParticipation.assisted.unavailable";
}

/** @returns {import("react").ReactElement} Selection removal confirmation. */
function RemovalDialog({
  cancelRef,
  isOpen,
  mutation,
  onClose,
  onConfirm,
  translate,
}) {
  return (
    <Dialog
      aria-labelledby="admin-assisted-removal-title"
      disableAutoFocus
      onClose={mutation.isPending ? undefined : onClose}
      open={isOpen}
      slotProps={{
        transition: { onEntered: () => cancelRef.current?.focus() },
      }}
    >
      <DialogTitle id="admin-assisted-removal-title">
        {translate("courseAccess.adminParticipation.assisted.removeTitle")}
      </DialogTitle>
      <DialogContent>
        <Typography>
          {translate("courseAccess.adminParticipation.assisted.removeDescription")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={mutation.isPending} onClick={onClose} ref={cancelRef}>
          {translate("courseAccess.adminParticipation.assisted.cancel")}
        </Button>
        <Button
          color="error"
          disabled={mutation.isPending}
          onClick={onConfirm}
          variant="contained"
        >
          {translate(
            mutation.isPending
              ? "courseAccess.adminParticipation.assisted.removing"
              : "courseAccess.adminParticipation.assisted.confirmRemove",
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
