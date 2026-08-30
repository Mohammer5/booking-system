import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import { CourseInviteSection } from "../course-access/index.js";
import { CourseArchivalControl } from "./CourseArchivalControl.jsx";
import { CourseEditSection } from "./CourseEditSection.jsx";
import { CourseRelationshipLinks } from "./CourseRelationshipLinks.jsx";
import { useCourseDetail } from "./useCourses.js";

/**
 * Present one refresh-safe Course detail route.
 *
 * @returns {import("react").ReactElement} The Course detail route.
 */
export function CourseDetailPage() {
  const { courseId } = useParams();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const courseQuery = useCourseDetail(courseId);
  const headingRef = useRef(null);
  const errorRef = useRef(null);
  const archivalSuccessRef = useRef(null);
  const [archivalResult, setArchivalResult] = useState(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(
    location.state?.courseCreated === true,
  );

  useEffect(() => {
    if (courseQuery.isSuccess && location.state?.courseCreated === true) {
      headingRef.current?.focus();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [courseQuery.isSuccess, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (courseQuery.isError) {
      errorRef.current?.focus();
    }
  }, [courseQuery.isError]);

  useEffect(() => {
    if (
      courseQuery.data?.state === "archived" &&
      archivalResult?.course.id === courseQuery.data.id
    ) {
      archivalSuccessRef.current?.focus();
    }
  }, [archivalResult, courseQuery.data]);

  return (
    <>
      <CourseDetailSurface
        courseQuery={courseQuery}
        archivalResult={archivalResult}
        archivalSuccessRef={archivalSuccessRef}
        errorRef={errorRef}
        headingRef={headingRef}
        onArchived={setArchivalResult}
        translate={t}
      />
      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        autoHideDuration={6000}
        onClose={() => setIsSuccessOpen(false)}
        open={isSuccessOpen}
        transitionDuration={0}
      >
        <Alert role="status" severity="success" variant="filled">
          {t("courseStructure.create.success")}
        </Alert>
      </Snackbar>
    </>
  );
}

/**
 * Present the stable Course detail surface and index navigation.
 *
 * @param {object} props Detail surface properties.
 * @returns {import("react").ReactElement} The Course detail surface.
 */
function CourseDetailSurface(props) {
  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: "56rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack component="section" spacing={3}>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin/courses"
        >
          {props.translate("courseStructure.navigation.toIndex")}
        </Button>
        <CourseDetailState {...props} />
      </Stack>
    </Paper>
  );
}

/**
 * Present loading, error, or stable Course detail state.
 *
 * @param {object} props Detail state properties.
 * @returns {import("react").ReactElement} The current detail state.
 */
function CourseDetailState(props) {
  const { courseQuery, errorRef, headingRef, translate } = props;
  if (courseQuery.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseStructure.detail.title")}
        </Typography>
        <Stack
          aria-live="polite"
          role="status"
          spacing={2}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>
            {translate("courseStructure.detail.loading")}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  if (courseQuery.isError) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseStructure.detail.title")}
        </Typography>
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {detailErrorMessage(courseQuery.error, translate)}
        </Alert>
      </Stack>
    );
  }

  return (
    <CourseDetails
      archivalResult={props.archivalResult}
      archivalSuccessRef={props.archivalSuccessRef}
      course={courseQuery.data}
      headingRef={headingRef}
      onArchived={props.onArchived}
      translate={translate}
    />
  );
}

/**
 * Present the canonical Course data with explicit lifecycle text.
 *
 * @param {object} props Course detail properties.
 * @returns {import("react").ReactElement} The resolved Course details.
 */
function CourseDetails(props) {
  const { course, headingRef, translate } = props;
  const isActive = course.state === "active";

  return (
    <Stack
      aria-labelledby="course-detail-title"
      component="article"
      spacing={3}
    >
      <CourseHeading
        course={course}
        headingRef={headingRef}
        translate={translate}
      />
      <CourseDescriptionList course={course} translate={translate} />
      <CourseRelationshipLinks course={course} translate={translate} />
      {props.archivalResult?.course.id === course.id ? (
        <Alert
          ref={props.archivalSuccessRef}
          role="status"
          severity="success"
          tabIndex={-1}
        >
          {translate("courseStructure.archival.success")}
        </Alert>
      ) : null}
      {isActive ? (
        <>
          <CourseEditSection course={course} />
          <CourseInviteSection course={course} />
          <CourseArchivalControl
            course={course}
            onArchived={props.onArchived}
            translate={translate}
          />
        </>
      ) : (
        <Alert severity="info">
          {translate("courseStructure.archival.readOnly")}
        </Alert>
      )}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Course identity and lifecycle. */
function CourseHeading({ course, headingRef, translate }) {
  const isActive = course.state === "active";

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        alignItems: { sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Typography
        component="h1"
        id="course-detail-title"
        ref={headingRef}
        tabIndex={-1}
        variant="h1"
      >
        {course.name}
      </Typography>
      <Chip
        color={isActive ? "success" : "default"}
        label={translate(`courseStructure.state.${course.state}`)}
        variant={isActive ? "filled" : "outlined"}
      />
    </Stack>
  );
}

/**
 * Present the semantic Course description list.
 *
 * @param {object} props Course data properties.
 * @returns {import("react").ReactElement} The Course description list.
 */
function CourseDescriptionList({ course, translate }) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: { xs: "1fr", sm: "minmax(10rem, 1fr) 2fr" },
        m: 0,
      }}
    >
      <DetailTerm label={translate("courseStructure.detail.description")}>
        {course.description ??
          translate("courseStructure.detail.noDescription")}
      </DetailTerm>
      <DetailTerm label={translate("courseStructure.detail.timezone")}>
        {course.timezone}
      </DetailTerm>
      <DetailTerm label={translate("courseStructure.detail.state")}>
        {translate(`courseStructure.state.${course.state}`)}
      </DetailTerm>
    </Box>
  );
}

/**
 * Present one semantic Course detail term and description pair.
 *
 * @param {object} props Detail pair properties.
 * @returns {import("react").ReactElement} One detail-list pair.
 */
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

/**
 * Map one Course-detail failure to localized presentation.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized error copy.
 */
function detailErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
  ]);

  if (error.outcome === "course-not-found") {
    return translate("courseStructure.detail.notFound");
  }

  return unavailableOutcomes.has(error.outcome)
    ? translate("courseStructure.status.unavailable")
    : translate("courseStructure.status.technicalError");
}
