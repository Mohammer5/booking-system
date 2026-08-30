import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

import { AdminAssistedModuleSelectionControl } from "./AdminAssistedModuleSelectionControl.jsx";
import { InstantValue } from "../course-structure/ModuleSchedule.jsx";

/** @returns {import("react").ReactElement} Module state, Selection, and control. */
export function AdminParticipationModuleCard(props) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <Typography component="h3" variant="h3">
              {props.module.title}
            </Typography>
            <Chip
              label={props.translate(
                `courseAccess.adminParticipation.structure.${props.module.state}`,
              )}
            />
          </Stack>
          <ModuleInterval {...props} />
          <SelectionPresentation {...props} />
          <AdminAssistedModuleSelectionControl {...props} />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {import("react").ReactElement} Semantic Module interval. */
function ModuleInterval({ module, timezone, translate }) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: { xs: "1fr", sm: "8rem 1fr" },
        m: 0,
      }}
    >
      <IntervalTerm
        label={translate("courseAccess.adminParticipation.structure.startsAt")}
      >
        <InstantValue instant={module.startsAt} timezone={timezone} />
      </IntervalTerm>
      <IntervalTerm
        label={translate("courseAccess.adminParticipation.structure.endsAt")}
      >
        <InstantValue instant={module.endsAt} timezone={timezone} />
      </IntervalTerm>
    </Box>
  );
}

/** @returns {import("react").ReactElement} One Module interval term. */
function IntervalTerm({ label, children }) {
  return (
    <>
      <Typography component="dt" fontWeight={700}>{label}</Typography>
      <Typography component="dd" sx={{ m: 0 }}>{children}</Typography>
    </>
  );
}

/** @returns {import("react").ReactElement} No Selection or derived history. */
function SelectionPresentation({ selection, translate }) {
  if (selection === undefined) {
    return (
      <Alert severity="info">
        <Typography fontWeight={700}>
          {translate("courseAccess.adminParticipation.detail.noSelection")}
        </Typography>
        {translate("courseAccess.adminParticipation.detail.noSelectionDescription")}
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Chip
          label={translate(
            `courseAccess.adminParticipation.detail.${selection.meaning}`,
          )}
        />
        <Chip label={translate(selectionPhaseKey(selection.phase))} variant="outlined" />
        <Chip
          label={translate(
            `courseAccess.adminParticipation.structure.${
              selection.group.state === "active"
                ? "activeGroup"
                : "archivedGroup"
            }`,
          )}
          variant="outlined"
        />
      </Stack>
      <Typography fontWeight={700}>
        {translate("courseAccess.adminParticipation.detail.selectedGroup", {
          name: selection.group.name,
        })}
      </Typography>
      <Typography>
        {selection.group.details ??
          translate("courseAccess.adminParticipation.structure.noDetails")}
      </Typography>
    </Stack>
  );
}

/** @returns {string} Translation key for derived Selection phase. */
function selectionPhaseKey(phase) {
  const key = phase === "in-progress" ? "inProgress" : phase;

  return `courseAccess.adminParticipation.detail.${
    key === "historical" ? "historicalPhase" : key
  }`;
}
