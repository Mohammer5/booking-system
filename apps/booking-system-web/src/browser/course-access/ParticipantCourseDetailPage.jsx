import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router";

import { ParticipantCourseStructure } from "./ParticipantCourseStructure.jsx";
import { useParticipantCourseDetail } from "./useParticipantCourses.js";

/**
 * Present one refresh-safe, currently authorized Participant Course.
 *
 * @returns {import("react").ReactElement} Participant Course detail route.
 */
export function ParticipantCourseDetailPage() {
  const { courseId } = useParams();
  const { t } = useTranslation();
  const courseQuery = useParticipantCourseDetail(courseId);
  const errorRef = useRef(null);

  useEffect(() => {
    if (courseQuery.isError) {
      errorRef.current?.focus();
    }
  }, [courseQuery.isError]);

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: "64rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack component="section" spacing={3}>
        <Button component={RouterLink} sx={{ alignSelf: "flex-start" }} to="/">
          {t("courseAccess.participantCourses.detail.toList")}
        </Button>
        <ParticipantCourseDetailState
          courseQuery={courseQuery}
          errorRef={errorRef}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Current Course-detail query state. */
function ParticipantCourseDetailState({ courseQuery, errorRef, translate }) {
  if (courseQuery.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.participantCourses.detail.title")}
        </Typography>
        <Stack
          aria-live="polite"
          role="status"
          spacing={2}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>
            {translate("courseAccess.participantCourses.detail.loading")}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  if (courseQuery.isError) {
    const isUnavailable = new Set([
      "course-unavailable",
      "unauthenticated",
      "no-participant",
      "disabled-participant",
    ]).has(courseQuery.error.outcome);

    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.participantCourses.detail.title")}
        </Typography>
        <Alert
          ref={errorRef}
          severity={isUnavailable ? "warning" : "error"}
          tabIndex={-1}
        >
          {translate(
            isUnavailable
              ? "courseAccess.participantCourses.status.unavailable"
              : "courseAccess.participantCourses.status.technicalError",
          )}
        </Alert>
      </Stack>
    );
  }

  return <ParticipantCourseDetails course={courseQuery.data} translate={translate} />;
}

/** @returns {import("react").ReactElement} Authorized Course detail. */
function ParticipantCourseDetails({ course, translate }) {
  const isActive = course.state === "active";

  return (
    <Stack component="article" spacing={4}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography component="h1" variant="h1">
          {course.name}
        </Typography>
        <Chip
          color={isActive ? "success" : "default"}
          label={translate(
            `courseAccess.participantCourses.state.${course.state}`,
          )}
          variant={isActive ? "filled" : "outlined"}
        />
      </Stack>
      {isActive ? null : (
        <Alert severity="info">
          {translate("courseAccess.participantCourses.detail.archivedReadOnly")}
        </Alert>
      )}
      {course.description === null ? null : (
        <Typography>{course.description}</Typography>
      )}
      <CourseMetadata course={course} translate={translate} />
      <ParticipantCourseStructure course={course} translate={translate} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Semantic Course metadata. */
function CourseMetadata({ course, translate }) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: { xs: "1fr", sm: "minmax(9rem, 1fr) 2fr" },
        m: 0,
      }}
    >
      <DetailTerm label={translate("courseAccess.participantCourses.detail.timezone")}>
        {course.timezone}
      </DetailTerm>
      <DetailTerm label={translate("courseAccess.participantCourses.detail.state")}>
        {translate(`courseAccess.participantCourses.state.${course.state}`)}
      </DetailTerm>
    </Box>
  );
}

/** @returns {import("react").ReactElement} One semantic detail pair. */
function DetailTerm({ label, children }) {
  return (
    <>
      <Typography component="dt" fontWeight={700}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </>
  );
}
