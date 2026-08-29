import {
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import { useParticipantCourseList } from "./useParticipantCourses.js";

/**
 * Present query-driven current Participant Course membership.
 *
 * @returns {import("react").ReactElement} Course list section.
 */
export function ParticipantCourseList() {
  const { t } = useTranslation();
  const courseQuery = useParticipantCourseList();
  const errorRef = useRef(null);

  useEffect(() => {
    if (courseQuery.isError) {
      errorRef.current?.focus();
    }
  }, [courseQuery.isError]);

  return (
    <Stack
      aria-labelledby="participant-course-list-title"
      component="section"
      spacing={2}
    >
      <Typography
        component="h2"
        id="participant-course-list-title"
        variant="h2"
      >
        {t("courseAccess.participantCourses.list.title")}
      </Typography>
      <ParticipantCourseListState
        courseQuery={courseQuery}
        errorRef={errorRef}
        translate={t}
      />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Current Course-list query state. */
function ParticipantCourseListState({ courseQuery, errorRef, translate }) {
  if (courseQuery.isPending) {
    return (
      <Stack
        aria-live="polite"
        role="status"
        spacing={2}
        sx={{ alignItems: "center" }}
      >
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>
          {translate("courseAccess.participantCourses.list.loading")}
        </Typography>
      </Stack>
    );
  }

  if (courseQuery.isError) {
    return (
      <Alert
        ref={errorRef}
        severity={isUnavailable(courseQuery.error) ? "warning" : "error"}
        tabIndex={-1}
      >
        {translate(
          isUnavailable(courseQuery.error)
            ? "courseAccess.participantCourses.status.unavailable"
            : "courseAccess.participantCourses.status.technicalError",
        )}
      </Alert>
    );
  }

  return (
    <ParticipantCourseListSuccess
      courses={courseQuery.data.courses}
      translate={translate}
    />
  );
}

/** @returns {import("react").ReactElement} Empty or populated Course list. */
function ParticipantCourseListSuccess({ courses, translate }) {
  if (courses.length === 0) {
    return (
      <Alert role="status" severity="info">
        <AlertTitle>
          {translate("courseAccess.participantCourses.list.emptyTitle")}
        </AlertTitle>
        {translate("courseAccess.participantCourses.list.emptyDescription")}
      </Alert>
    );
  }

  return (
    <List
      aria-label={translate("courseAccess.participantCourses.list.label")}
      disablePadding
    >
      {courses.map((course) => (
        <ListItem disablePadding key={course.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    alignItems: { sm: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <Link
                    component={RouterLink}
                    to={`/courses/${course.id}`}
                    variant="h3"
                  >
                    {course.name}
                  </Link>
                  <Chip
                    color={course.state === "active" ? "success" : "default"}
                    label={translate(
                      `courseAccess.participantCourses.state.${course.state}`,
                    )}
                    sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
                    variant={course.state === "active" ? "filled" : "outlined"}
                  />
                </Stack>
                {course.description === null ? null : (
                  <Typography>{course.description}</Typography>
                )}
                <Typography variant="body2">{course.timezone}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {boolean} Whether an error is an expected current-context refusal. */
function isUnavailable(error) {
  return new Set([
    "unauthenticated",
    "no-participant",
    "disabled-participant",
  ]).has(error.outcome);
}
