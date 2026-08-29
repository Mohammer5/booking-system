import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router";

import { InstantValue } from "./AdministrativeCourseStructure.jsx";
import { administrativeParticipationErrorMessage } from "./administrativeParticipationErrorMessage.js";
import { useAdministrativeCourseParticipation } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Course-scoped Participant detail. */
export function AdminCourseParticipationDetailPage() {
  const { courseId, participantId } = useParams();
  const query = useAdministrativeCourseParticipation(courseId);
  const errorRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const isParticipantMissing =
      query.isSuccess &&
      !query.data.participations.some(
        ({ participant }) => participant.id === participantId,
      );

    if (query.isError || isParticipantMissing) errorRef.current?.focus();
  }, [participantId, query.data, query.isError, query.isSuccess]);

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: "68rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack component="section" spacing={3}>
        <DetailNavigation courseId={courseId} translate={t} />
        <DetailState
          errorRef={errorRef}
          participantId={participantId}
          query={query}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Safe Course and overview links. */
function DetailNavigation({ courseId, translate }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <Button component={RouterLink} to={`/admin/courses/${courseId}/participation`}>
        {translate("courseAccess.adminParticipation.toOverview")}
      </Button>
      <Button component={RouterLink} to={`/admin/courses/${courseId}`}>
        {translate("courseAccess.adminParticipation.toCourse")}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Loading, failure, or detail. */
function DetailState({ errorRef, participantId, query, translate }) {
  if (query.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.adminParticipation.title")}
        </Typography>
        <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>{translate("courseAccess.adminParticipation.loading")}</Typography>
        </Stack>
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <DetailError
        errorRef={errorRef}
        message={administrativeParticipationErrorMessage(query.error, translate)}
        translate={translate}
      />
    );
  }

  const participation = query.data.participations.find(
    ({ participant }) => participant.id === participantId,
  );

  return participation === undefined ? (
    <DetailError
      errorRef={errorRef}
      message={translate("courseAccess.adminParticipation.detail.unavailable")}
      translate={translate}
    />
  ) : (
    <ParticipationDetail
      data={query.data}
      participation={participation}
      translate={translate}
    />
  );
}

/** @returns {import("react").ReactElement} Focusable contextual error. */
function DetailError({ errorRef, message, translate }) {
  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("courseAccess.adminParticipation.title")}
      </Typography>
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {message}
      </Alert>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Complete Participant participation. */
function ParticipationDetail({ data, participation, translate }) {
  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("courseAccess.adminParticipation.detail.title", {
          name: participation.participant.name,
        })}
      </Typography>
      <Typography>
        {translate("courseAccess.adminParticipation.detail.description")}
      </Typography>
      <Typography>{data.course.name}</Typography>
      <Typography>{participation.participant.email}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Chip
          label={translate(
            `courseAccess.participantState.${participation.participant.state}`,
          )}
          variant={participation.participant.state === "active" ? "filled" : "outlined"}
        />
        <Chip
          label={translate(
            `courseAccess.assignmentState.${participation.assignment.state}`,
          )}
          variant={participation.assignment.state === "active" ? "filled" : "outlined"}
        />
        <Chip
          label={translate(`courseStructure.state.${data.course.state}`)}
          variant={data.course.state === "active" ? "filled" : "outlined"}
        />
      </Stack>
      {data.course.state === "archived" ? (
        <Alert severity="info">
          {translate("courseAccess.adminParticipation.archived")}
        </Alert>
      ) : null}
      <ModuleParticipationList
        data={data}
        participation={participation}
        translate={translate}
      />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Every Module and current Selection. */
function ModuleParticipationList({ data, participation, translate }) {
  return (
    <Stack aria-labelledby="admin-participant-modules" component="section" spacing={2}>
      <Typography component="h2" id="admin-participant-modules" variant="h2">
        {translate("courseAccess.adminParticipation.detail.modulesTitle")}
      </Typography>
      {data.modules.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.adminParticipation.detail.modulesEmpty")}
        </Alert>
      ) : (
        <List
          aria-label={translate(
            "courseAccess.adminParticipation.detail.modulesLabel",
            { name: participation.participant.name },
          )}
          disablePadding
        >
          {data.modules.map((module) => (
            <ListItem disablePadding key={module.id} sx={{ mb: 2 }}>
              <ModuleParticipationCard
                module={module}
                selection={participation.selections.find(
                  ({ moduleId }) => moduleId === module.id,
                )}
                timezone={data.course.timezone}
                translate={translate}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Module lifecycle and Selection. */
function ModuleParticipationCard({ module, selection, timezone, translate }) {
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
              {module.title}
            </Typography>
            <Chip
              label={translate(
                `courseAccess.adminParticipation.structure.${module.state}`,
              )}
            />
          </Stack>
          <ModuleInterval module={module} timezone={timezone} translate={translate} />
          <SelectionPresentation selection={selection} translate={translate} />
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
      sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "8rem 1fr" }, m: 0 }}
    >
      <IntervalTerm label={translate("courseAccess.adminParticipation.structure.startsAt")}>
        <InstantValue instant={module.startsAt} timezone={timezone} />
      </IntervalTerm>
      <IntervalTerm label={translate("courseAccess.adminParticipation.structure.endsAt")}>
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
        <Chip label={translate(`courseAccess.adminParticipation.detail.${selection.meaning}`)} />
        <Chip label={translate(selectionPhaseKey(selection.phase))} variant="outlined" />
        <Chip
          label={translate(
            `courseAccess.adminParticipation.structure.${
              selection.group.state === "active" ? "activeGroup" : "archivedGroup"
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
