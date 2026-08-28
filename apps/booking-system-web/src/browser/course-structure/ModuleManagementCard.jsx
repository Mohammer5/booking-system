import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

import { ModuleDetailsForm } from "./ModuleDetailsForm.jsx";
import { ModuleCancellationControl } from "./ModuleCancellationControl.jsx";
import { ModuleSchedule } from "./ModuleSchedule.jsx";
import { ModuleScheduleForm } from "./ModuleScheduleForm.jsx";

/** @returns {import("react").ReactElement} One retained Module management card. */
export function ModuleManagementCard({ course, module, translate }) {
  const titleId = `module-${module.id}-title`;

  return (
    <Card
      aria-labelledby={titleId}
      component="article"
      sx={{ width: "100%" }}
      variant="outlined"
    >
      <CardContent>
        <Stack spacing={3}>
          <ModuleIdentity module={module} titleId={titleId} translate={translate} />
          <ModuleSchedule
            module={module}
            timezone={course.timezone}
            translate={translate}
          />
          <ModuleDetailsForm
            courseId={course.id}
            module={module}
            translate={translate}
          />
          <ModuleScheduleForm
            course={course}
            module={module}
            translate={translate}
          />
          <ModuleCancellationControl
            courseId={course.id}
            module={module}
            translate={translate}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {import("react").ReactElement} Stable Module identity and details. */
function ModuleIdentity({ module, titleId, translate }) {
  return (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography component="h3" id={titleId} variant="h3">
          {module.title}
        </Typography>
        <Chip
          color={module.state === "scheduled" ? "success" : "default"}
          label={translate(`courseStructure.module.state.${module.state}`)}
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
          variant="outlined"
        />
      </Stack>
      <Typography>
        {module.description ?? translate("courseStructure.module.noDescription")}
      </Typography>
      <Typography>
        {module.instructions ?? translate("courseStructure.module.noInstructions")}
      </Typography>
    </Stack>
  );
}
