import {
  Alert,
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
import { Link as RouterLink } from "react-router";

import { useCourseIndex } from "./useCourses.js";

/**
 * Present the directly navigable Course index and truthful empty state.
 *
 * @returns {import("react").ReactElement} The Course index route.
 */
export function CourseIndexPage() {
  const { t } = useTranslation();
  const courseQuery = useCourseIndex();
  const errorRef = useRef(null);

  useEffect(() => {
    if (courseQuery.isError) {
      errorRef.current?.focus();
    }
  }, [courseQuery.isError]);

  return (
    <Paper
      elevation={2}
      sx={{ mx: "auto", overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}
    >
      <Stack component="section" spacing={3}>
        <IndexHeading translate={t} />
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin"
        >
          {t("courseStructure.navigation.toAdministration")}
        </Button>
        <CourseIndexState
          courseQuery={courseQuery}
          errorRef={errorRef}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/**
 * Present the Course-index heading and primary action responsively.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The index heading row.
 */
function IndexHeading({ translate }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        alignItems: { sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Typography component="h1" variant="h1">
        {translate("courseStructure.index.title")}
      </Typography>
      <Button
        component={RouterLink}
        to="/admin/courses/new"
        variant="contained"
      >
        {translate("courseStructure.index.create")}
      </Button>
    </Stack>
  );
}

/**
 * Present loading, error, empty, or populated Course-index state.
 *
 * @param {object} props Index state properties.
 * @returns {import("react").ReactElement} The current index state.
 */
function CourseIndexState({ courseQuery, translate, errorRef }) {
  if (courseQuery.isPending) {
    return (
      <Stack
        aria-live="polite"
        role="status"
        spacing={2}
        sx={{ alignItems: "center" }}
      >
        <CircularProgress aria-hidden="true" size={36} />
        <Typography>{translate("courseStructure.index.loading")}</Typography>
      </Stack>
    );
  }

  if (courseQuery.isError) {
    return (
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {courseErrorMessage(courseQuery.error, translate)}
      </Alert>
    );
  }

  if (courseQuery.data.courses.length === 0) {
    return (
      <Alert role="status" severity="info">
        {translate("courseStructure.index.empty")}
      </Alert>
    );
  }

  return (
    <CourseList
      courses={courseQuery.data.courses}
      translate={translate}
    />
  );
}

/**
 * Present the semantic list of current Courses.
 *
 * @param {object} props Course-list properties.
 * @returns {import("react").ReactElement} The populated Course list.
 */
function CourseList({ courses, translate }) {
  return (
    <List
      aria-label={translate("courseStructure.index.listLabel")}
      disablePadding
    >
      {courses.map((course) => (
        <ListItem disablePadding key={course.id} sx={{ mb: 2 }}>
          <CourseListCard course={course} translate={translate} />
        </ListItem>
      ))}
    </List>
  );
}

/**
 * Present one Course index entry with text lifecycle status.
 *
 * @param {object} props Course-card properties.
 * @returns {import("react").ReactElement} One Course list card.
 */
function CourseListCard({ course, translate }) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Typography component="h2" variant="h2">
              {course.name}
            </Typography>
            <Chip
              color={course.state === "active" ? "success" : "default"}
              label={translate(`courseStructure.state.${course.state}`)}
              variant={course.state === "active" ? "filled" : "outlined"}
            />
          </Stack>
          <Typography>{course.timezone}</Typography>
          <Button
            component={RouterLink}
            sx={{ alignSelf: "flex-start" }}
            to={`/admin/courses/${course.id}`}
            variant="outlined"
          >
            {translate("courseStructure.index.open")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Map a Course request outcome to localized presentation.
 *
 * @param {Error} error The language-neutral remote failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized error copy.
 */
function courseErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
  ]);

  return unavailableOutcomes.has(error.outcome)
    ? translate("courseStructure.status.unavailable")
    : translate("courseStructure.status.technicalError");
}
