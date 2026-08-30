import { Button, Stack, Typography } from "@mui/material";

import { ModuleDeletionDialog } from "./ModuleDeletionDialog.jsx";
import { useModuleDeletion } from "./useModuleDeletion.js";

/** @returns {import("react").ReactElement} Permanent Module deletion control. */
export function ModuleDeletionControl(props) {
  const state = useModuleDeletion(
    props.courseId,
    props.module,
    props.onDeleted,
  );
  const titleId = `module-${props.module.id}-deletion-title`;

  return (
    <Stack aria-labelledby={titleId} spacing={2}>
      <Typography component={props.headingComponent ?? "h4"} id={titleId}
        variant="h4">
        {props.translate("courseStructure.module.deletionTitle")}
      </Typography>
      <Button
        color="error"
        onClick={state.open}
        ref={state.actionRef}
        sx={{ alignSelf: "flex-start" }}
        type="button"
        variant="outlined"
      >
        {props.translate("courseStructure.module.deleteAction")}
      </Button>
      {state.isOpen ? (
        <ModuleDeletionDialog
          module={props.module}
          mutation={state.mutation}
          onCancel={state.cancel}
          onConfirm={state.confirm}
          translate={props.translate}
        />
      ) : null}
    </Stack>
  );
}
