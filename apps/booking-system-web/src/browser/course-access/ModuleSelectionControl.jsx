import {
  Alert,
  Button,
  Chip,
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
  useRemoveParticipantModuleSelection,
  useSetParticipantModuleSelection,
} from "./useParticipantCourses.js";

/**
 * Present one Participant's explicit Group choice for one Module.
 *
 * @param {object} props Selection control properties.
 * @returns {import("react").ReactElement} Accessible Selection interaction.
 */
export function ModuleSelectionControl({ courseId, module, groups, translate }) {
  const control = useSelectionControlState(courseId, module);

  return (
    <Stack spacing={2}>
      <SelectionSummary module={module} translate={translate} />
      {control.isMutable ? (
        <SelectionForm
          form={control.form}
          groups={groups}
          moduleId={module.id}
          mutation={control.setMutation}
          onSubmit={control.form.handleSubmit(({ groupId }) =>
            control.setMutation.mutate(groupId),
          )}
          translate={translate}
        />
      ) : (
        <Alert severity="info">
          {translate("courseAccess.participantCourses.selection.locked")}
        </Alert>
      )}
      <MutationResult
        removeMutation={control.removeMutation}
        resultRef={control.resultRef}
        setMutation={control.setMutation}
        translate={translate}
      />
      {module.selection === null || !control.isMutable ? null : (
        <Button
          color="error"
          onClick={() => control.setIsRemoveOpen(true)}
          sx={{ alignSelf: "flex-start" }}
          variant="outlined"
        >
          {translate("courseAccess.participantCourses.selection.remove")}
        </Button>
      )}
      <RemovalDialog
        isOpen={control.isRemoveOpen}
        mutation={control.removeMutation}
        onClose={() => control.setIsRemoveOpen(false)}
        onConfirm={control.confirmRemoval}
        translate={translate}
      />
    </Stack>
  );
}

/** @returns {object} Local form, mutation, Dialog, and result-focus state. */
function useSelectionControlState(courseId, module) {
  const setMutation = useSetParticipantModuleSelection(courseId, module.id);
  const removeMutation = useRemoveParticipantModuleSelection(courseId, module.id);
  const resultRef = useRef(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const form = useForm({
    defaultValues: { groupId: module.selection?.group.id ?? "" },
  });

  useEffect(() => {
    form.reset({ groupId: module.selection?.group.id ?? "" });
  }, [form, module.selection?.group.id]);
  useEffect(() => {
    const hasSetResult = setMutation.isSuccess || setMutation.isError;
    const hasClosedRemovalResult =
      !isRemoveOpen && (removeMutation.isSuccess || removeMutation.isError);

    if (hasSetResult || hasClosedRemovalResult) {
      resultRef.current?.focus();
    }
  }, [isRemoveOpen, removeMutation.isError, removeMutation.isSuccess,
    setMutation.isError, setMutation.isSuccess]);

  return {
    confirmRemoval: () =>
      removeMutation.mutate(undefined, {
        onSettled: () => setIsRemoveOpen(false),
      }),
    form,
    isMutable: module.selectionAvailability === "open",
    isRemoveOpen,
    removeMutation,
    resultRef,
    setIsRemoveOpen,
    setMutation,
  };
}

/** @returns {import("react").ReactElement} Current choice and derived meaning. */
function SelectionSummary({ module, translate }) {
  return (
    <Stack spacing={1}>
      <Typography component="h4" variant="h4">
        {translate("courseAccess.participantCourses.selection.title")}
      </Typography>
      {module.selection === null ? (
        <>
          <Chip
            label={translate("courseAccess.participantCourses.selection.none")}
            sx={{ alignSelf: "flex-start" }}
            variant="outlined"
          />
          <Typography>
            {translate("courseAccess.participantCourses.selection.noneDescription")}
          </Typography>
        </>
      ) : (
        <Stack spacing={1}>
          <Typography>
            {translate("courseAccess.participantCourses.selection.current", {
              group: module.selection.group.name,
            })}
          </Typography>
          <Typography>
            {module.selection.group.details ??
              translate(
                "courseAccess.participantCourses.selection.groupNoDetails",
              )}
          </Typography>
          <Chip
            label={translate(
              `courseAccess.participantCourses.selection.groupState.${
                module.selection.group.state
              }`,
            )}
            sx={{ alignSelf: "flex-start" }}
            variant="outlined"
          />
          <Chip
            color={module.selection.meaning === "live" ? "success" : "default"}
            label={translate(
              `courseAccess.participantCourses.selection.${module.selection.meaning}`,
            )}
            sx={{ alignSelf: "flex-start" }}
          />
        </Stack>
      )}
      <Typography>
        {translate("courseAccess.participantCourses.selection.deadline", {
          instant: module.startsAt,
        })}
      </Typography>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Explicit Group choice form. */
function SelectionForm({ form, groups, moduleId, mutation, onSubmit, translate }) {
  const labelId = `selection-group-${moduleId}`;

  return (
    <Stack component="form" noValidate onSubmit={onSubmit} spacing={2}>
      <Controller
        control={form.control}
        name="groupId"
        render={({ field, fieldState }) => (
          <FormControl error={fieldState.invalid} required>
            <FormLabel id={labelId}>
              {translate("courseAccess.participantCourses.selection.groupLabel")}
            </FormLabel>
            <RadioGroup
              {...field}
              aria-labelledby={labelId}
            >
              {groups.map((group) => (
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
          required: translate("courseAccess.participantCourses.selection.required"),
        }}
      />
      {groups.length === 0 ? (
        <Alert severity="warning">
          {translate("courseAccess.participantCourses.selection.noGroups")}
        </Alert>
      ) : null}
      <Button
        disabled={mutation.isPending || groups.length === 0}
        sx={{ alignSelf: "flex-start" }}
        type="submit"
        variant="contained"
      >
        {translate(
          mutation.isPending
            ? "courseAccess.participantCourses.selection.saving"
            : "courseAccess.participantCourses.selection.save",
        )}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement | null} Mutation result announcement. */
function MutationResult({ resultRef, removeMutation, setMutation, translate }) {
  const result = setMutation.data ?? removeMutation.data;
  const error = setMutation.error ?? removeMutation.error;

  if (error !== null) {
    return (
      <Alert ref={resultRef} severity="error" tabIndex={-1}>
        {translate(
          error.outcome === "technical-error"
            ? "courseAccess.participantCourses.selection.technicalError"
            : "courseAccess.participantCourses.selection.unavailable",
        )}
      </Alert>
    );
  }

  return result === undefined ? null : (
    <Alert ref={resultRef} role="status" severity="success" tabIndex={-1}>
      {translate(`courseAccess.participantCourses.selection.${result.outcome}`)}
    </Alert>
  );
}

/** @returns {import("react").ReactElement} Destructive-intent confirmation. */
function RemovalDialog({ isOpen, mutation, onClose, onConfirm, translate }) {
  return (
    <Dialog aria-labelledby="selection-removal-title" open={isOpen} onClose={onClose}>
      <DialogTitle id="selection-removal-title">
        {translate("courseAccess.participantCourses.selection.removeTitle")}
      </DialogTitle>
      <DialogContent>
        <Typography>
          {translate("courseAccess.participantCourses.selection.removeDescription")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button autoFocus disabled={mutation.isPending} onClick={onClose}>
          {translate("courseAccess.participantCourses.selection.cancel")}
        </Button>
        <Button
          color="error"
          disabled={mutation.isPending}
          onClick={onConfirm}
          variant="contained"
        >
          {translate(
            mutation.isPending
              ? "courseAccess.participantCourses.selection.removing"
              : "courseAccess.participantCourses.selection.confirmRemove",
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
