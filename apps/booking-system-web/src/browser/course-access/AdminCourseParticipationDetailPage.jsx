import {
  Alert,
  Button,
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

import { AdminParticipationModuleCard } from "./AdminParticipationModuleCard.jsx";
import { administrativeParticipationErrorMessage } from "./administrativeParticipationErrorMessage.js";
import { useAdministrativeParticipantParticipation } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Course-scoped Participant detail. */
export function AdminCourseParticipationDetailPage() {
  const { courseId, participantId } = useParams();
  const query = useAdministrativeParticipantParticipation(courseId, participantId);
  const errorRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

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
function DetailState({ errorRef, query, translate }) {
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
        message={query.error.status === 404
          ? translate("courseAccess.adminParticipation.detail.unavailable")
          : administrativeParticipationErrorMessage(query.error, translate)}
        translate={translate}
      />
    );
  }

  return (
    <ParticipationDetail
      data={query.data}
      participation={query.data.participation}
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
        {participation.assignment === null ? (
          <Chip
            label={translate(
              "courseAccess.adminParticipation.detail.noAssignment",
            )}
            variant="outlined"
          />
        ) : (
          <Chip
            label={translate(
              `courseAccess.assignmentState.${participation.assignment.state}`,
            )}
            variant={participation.assignment.state === "active" ? "filled" : "outlined"}
          />
        )}
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
              <AdminParticipationModuleCard
                assignment={participation.assignment}
                courseId={data.course.id}
                groups={data.groups}
                module={module}
                participantId={participation.participant.id}
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
