import { Alert, Button, Stack, Typography } from "@mui/material";

import { ModuleCancellationDialog } from "./ModuleCancellationDialog.jsx";
import { useModuleCancellation } from "./useModuleCancellation.js";

/** @returns {import("react").ReactElement} Current Module cancellation action. */
export function ModuleCancellationControl({
  courseId,
  headingComponent = "h4",
  module,
  translate,
}) {
  const state = useModuleCancellation(courseId, module.id);
  const titleId = `module-${module.id}-cancellation-title`;

  return (
    <Stack aria-labelledby={titleId} spacing={2}>
      <Typography component={headingComponent} id={titleId} variant="h4">
        {translate("courseStructure.module.cancellationTitle")}
      </Typography>
      <CancellationAvailability module={module} state={state} translate={translate} />
      {state.outcome === "cancelled" ? (
        <Alert ref={state.successRef} role="status" severity="success" tabIndex={-1}>
          {translate("courseStructure.module.cancellationSuccess")}
        </Alert>
      ) : null}
      {state.isOpen ? (
        <ModuleCancellationDialog
          module={module}
          mutation={state.cancellation}
          onCancel={state.cancel}
          onConfirm={state.confirm}
          translate={translate}
        />
      ) : null}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Action or explicit terminal lock. */
function CancellationAvailability({ module, state, translate }) {
  if (module.state === "cancelled") {
    return (
      <Alert role="status" severity="info">
        {translate("courseStructure.module.cancellationTerminal")}
      </Alert>
    );
  }

  if (!module.isCancellationAvailable) {
    return (
      <Alert role="status" severity="info">
        {translate("courseStructure.module.cancellationEnded")}
      </Alert>
    );
  }

  return (
    <Button
      color="error"
      onClick={state.open}
      ref={state.actionRef}
      sx={{ alignSelf: "flex-start" }}
      type="button"
      variant="outlined"
    >
      {translate("courseStructure.module.cancelAction")}
    </Button>
  );
}
