import {
  Alert,
  Box,
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
import { useLocation, useParams } from "react-router";

import { AdminCourseBreadcrumbs } from "../course-structure/index.js";
import { AdminParticipationModuleCard } from "./AdminParticipationModuleCard.jsx";
import { CourseParticipantAssignmentControl } from "./CourseParticipantAssignmentControl.jsx";
import { administrativeParticipationErrorMessage } from "./administrativeParticipationErrorMessage.js";
import { useAdministrativeParticipantParticipation } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Course-scoped Participant detail. */
export function CourseParticipantDetailPage() {
  const { courseId, participantId } = useParams();
  const { t } = useTranslation();
  const location = useLocation();
  const query = useAdministrativeParticipantParticipation(courseId, participantId);
  const errorRef = useRef(null);

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

  return (
    <Paper elevation={2} sx={{ maxWidth: "68rem", mx: "auto",
      overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <DetailState errorRef={errorRef} listPath={safeListPath(
          location.state?.courseParticipantCollectionPath,
          courseId,
        )} query={query} translate={t} />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Loading, failure, or detail. */
function DetailState({ errorRef, listPath, query, translate }) {
  if (query.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.courseParticipants.detail.loadingTitle")}
        </Typography>
        <Stack aria-live="polite" role="status" spacing={2}
          sx={{ alignItems: "center" }}>
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>{translate("courseAccess.adminParticipation.loading")}</Typography>
        </Stack>
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.courseParticipants.detail.loadingTitle")}
        </Typography>
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {query.error.status === 404
            ? translate("courseAccess.adminParticipation.detail.unavailable")
            : administrativeParticipationErrorMessage(query.error, translate)}
        </Alert>
      </Stack>
    );
  }

  return <ParticipantDetail data={query.data} listPath={listPath}
    translate={translate} />;
}

/** @returns {import("react").ReactElement} Participant and Course relation. */
function ParticipantDetail({ data, listPath, translate }) {
  const { course, participation } = data;

  return (
    <Stack spacing={3}>
      <AdminCourseBreadcrumbs course={course} trail={[
        {
          label: translate("courseAccess.courseParticipants.title"),
          to: listPath,
        },
        { label: participation.participant.name },
      ]} />
      <Typography component="h1" variant="h1">
        {translate("courseAccess.adminParticipation.detail.title", {
          name: participation.participant.name,
        })}
      </Typography>
      <Typography>
        {translate("courseAccess.adminParticipation.detail.description")}
      </Typography>
      <ParticipantFacts participation={participation} translate={translate} />
      {course.state === "archived" ? (
        <Alert severity="info">
          {translate("courseAccess.adminParticipation.archived")}
        </Alert>
      ) : null}
      <CourseParticipantAssignmentControl course={course}
        participation={participation} translate={translate} />
      <ModuleParticipationList data={data} participation={participation}
        translate={translate} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Identity and lifecycle facts. */
function ParticipantFacts({ participation, translate }) {
  const assignmentState = participation.assignment?.state;

  return (
    <Box component="dl" sx={{ display: "grid", gap: 1.5,
      gridTemplateColumns: { xs: "1fr", sm: "10rem 1fr" }, m: 0 }}>
      <Fact label={translate("courseAccess.courseParticipants.fields.email")}>
        {participation.participant.email}
      </Fact>
      <Fact label={translate("courseAccess.courseParticipants.fields.participantState")}>
        <Chip label={translate(
          `courseAccess.participantState.${participation.participant.state}`,
        )} />
      </Fact>
      <Fact label={translate("courseAccess.courseParticipants.fields.assignmentState")}>
        <Chip label={translate(assignmentState === undefined
          ? "courseAccess.adminParticipation.detail.noAssignment"
          : `courseAccess.assignmentState.${assignmentState}`)} variant="outlined" />
      </Fact>
    </Box>
  );
}

/** @returns {import("react").ReactElement} One semantic detail pair. */
function Fact({ children, label }) {
  return (
    <>
      <Typography component="dt" fontWeight={700}>{label}</Typography>
      <Box component="dd" sx={{ m: 0 }}>{children}</Box>
    </>
  );
}

/** @returns {import("react").ReactElement} Module history and controls. */
function ModuleParticipationList({ data, participation, translate }) {
  return (
    <Stack aria-labelledby="admin-participant-modules" component="section"
      spacing={2}>
      <Typography component="h2" id="admin-participant-modules" variant="h2">
        {translate("courseAccess.adminParticipation.detail.modulesTitle")}
      </Typography>
      {data.modules.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.adminParticipation.detail.modulesEmpty")}
        </Alert>
      ) : (
        <List aria-label={translate(
          "courseAccess.adminParticipation.detail.modulesLabel",
          { name: participation.participant.name },
        )} disablePadding>
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

/** @returns {string} Valid internal list return target. */
function safeListPath(candidate, courseId) {
  const base = `/admin/courses/${courseId}/participants`;

  return candidate === base || candidate?.startsWith(`${base}?`)
    ? candidate
    : base;
}
