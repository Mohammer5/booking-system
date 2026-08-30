import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { GroupDeletionDialog } from "./GroupDeletionDialog.jsx";
import { GroupLifecycleDialog } from "./GroupLifecycleDialog.jsx";
import { useGroupDeletion } from "./useGroupDeletion.js";
import { useGroupManagement } from "./useGroupManagement.js";

/**
 * Present one retained Group identity with complete editing and lifecycle action.
 *
 * @param {object} props Current Group, parent Course, and translation function.
 * @returns {import("react").ReactElement} Group management card.
 */
export function GroupManagementCard({
  courseId,
  group,
  headingComponent = "h3",
  isReadOnly,
  onDeleted,
  translate,
}) {
  const state = useGroupManagement(courseId, group, translate);
  const deletion = useGroupDeletion(courseId, group, onDeleted);
  const titleId = `group-${group.id}-title`;
  const editTitleId = `group-${group.id}-edit-title`;
  const editHeadingComponent = headingComponent === "h1" ? "h2" : "h4";

  return (
    <Card
      aria-labelledby={titleId}
      component="article"
      sx={{ width: "100%" }}
      variant="outlined"
    >
      <CardContent>
        <Stack spacing={2}>
          <GroupIdentity group={group} headingComponent={headingComponent}
            titleId={titleId} translate={translate} />
          {isReadOnly ? null : (
            <>
              <Typography component={editHeadingComponent} id={editTitleId}
                variant="h4">
                {translate("courseStructure.group.editTitle")}
              </Typography>
              <GroupEditForm
                group={group}
                state={state}
                translate={translate}
              />
              <GroupManagementActions
                deletion={deletion}
                group={group}
                state={state}
                translate={translate}
              />
              <GroupLifecycleResult state={state} translate={translate} />
            </>
          )}
        </Stack>
      </CardContent>
      {isReadOnly ? null : (
        <GroupManagementDialogs
          deletion={deletion}
          group={group}
          state={state}
          translate={translate}
        />
      )}
    </Card>
  );
}

/** @returns {import("react").ReactElement} Separate lifecycle and deletion actions. */
function GroupManagementActions({ deletion, group, state, translate }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <Button
        color={group.state === "active" ? "error" : "primary"}
        onClick={state.openLifecycle}
        ref={state.actionRef}
        type="button"
        variant="outlined"
      >
        {translate(`courseStructure.group.${state.currentAction}Action`)}
      </Button>
      <Button
        color="error"
        onClick={deletion.open}
        ref={deletion.actionRef}
        type="button"
        variant="outlined"
      >
        {translate("courseStructure.group.deleteAction")}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Current Group management Dialogs. */
function GroupManagementDialogs({ deletion, group, state, translate }) {
  return (
    <>
      {state.dialogAction === null ? null : (
        <GroupLifecycleDialog
          action={state.dialogAction}
          group={group}
          mutation={state.lifecycleMutation}
          onCancel={state.cancelLifecycle}
          onConfirm={state.confirmLifecycle}
          translate={translate}
        />
      )}
      {deletion.isOpen ? (
        <GroupDeletionDialog
          group={group}
          mutation={deletion.mutation}
          onCancel={deletion.cancel}
          onConfirm={deletion.confirm}
          translate={translate}
        />
      ) : null}
    </>
  );
}

/** @returns {import("react").ReactElement} Stable identity, state, and details. */
function GroupIdentity({ group, headingComponent, titleId, translate }) {
  return (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography component={headingComponent} id={titleId} variant="h3">
          {group.name}
        </Typography>
        <Chip
          color={group.state === "active" ? "success" : "default"}
          label={translate(`courseStructure.state.${group.state}`)}
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
          variant="outlined"
        />
      </Stack>
      <Typography>
        {group.details ?? translate("courseStructure.group.noDetails")}
      </Typography>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Complete field form and feedback. */
function GroupEditForm({ group, state, translate }) {
  const errors = state.form.formState.errors;

  return (
    <Stack
      component="form"
      onSubmit={state.submitEdit}
      spacing={2}
    >
      <TextField
        autoComplete="off"
        error={Boolean(errors.name)}
        fullWidth
        helperText={errors.name?.message ?? " "}
        id={`group-${group.id}-edit-name`}
        label={translate("courseStructure.group.editNameLabel")}
        {...state.form.register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            translate("courseStructure.group.nameRequired"),
        })}
      />
      <TextField
        error={Boolean(errors.details)}
        fullWidth
        helperText={
          errors.details?.message ??
          translate("courseStructure.group.detailsOptional")
        }
        id={`group-${group.id}-edit-details`}
        label={translate("courseStructure.group.editDetailsLabel")}
        minRows={2}
        multiline
        {...state.form.register("details")}
      />
      <GroupEditResult state={state} translate={translate} />
      <Button disabled={state.edit.isPending} type="submit" variant="contained">
        {translate(
          `courseStructure.group.${
            state.edit.isPending ? "editPending" : "editSubmit"
          }`,
        )}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement | null} Focused edit result. */
function GroupEditResult({ state, translate }) {
  if (state.hasEditFormError) {
    return (
      <Alert ref={state.editErrorRef} severity="error" tabIndex={-1}>
        {translate("courseStructure.group.editUnavailable")}
      </Alert>
    );
  }

  return state.edit.isSuccess ? (
    <Alert ref={state.editSuccessRef} role="status" severity="success" tabIndex={-1}>
      {translate("courseStructure.group.editSuccess")}
    </Alert>
  ) : null;
}

/** @returns {import("react").ReactElement | null} Focused lifecycle success. */
function GroupLifecycleResult({ state, translate }) {
  return state.lifecycleOutcome === null ? null : (
    <Alert
      ref={state.lifecycleSuccessRef}
      role="status"
      severity="success"
      tabIndex={-1}
    >
      {translate(`courseStructure.group.${state.lifecycleOutcome}`)}
    </Alert>
  );
}
