import { Alert, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router";

import { AdminCourseBreadcrumbs } from "./AdminCourseBreadcrumbs.jsx";
import { ModuleCreationForm } from "./ModuleCreationForm.jsx";
import { useCourseDetail } from "./useCourses.js";

/** @returns {import("react").ReactElement} Stable Course Module create route. */
export function ModuleCreatePage() {
  const { courseId } = useParams();
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const query = useCourseDetail(courseId);
  const errorRef = useRef(null);

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

  return (
    <Paper elevation={2} sx={{ maxWidth: "52rem", mx: "auto",
      overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <ModuleCreateState errorRef={errorRef} query={query}
          onSuccess={(module) => navigate(
            `/admin/courses/${courseId}/modules/${module.id}`,
            { state: { moduleCreated: true } },
          )} translate={translate} />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Loading, failure, or create form. */
function ModuleCreateState({ errorRef, onSuccess, query, translate }) {
  if (query.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseStructure.module.createTitle")}
        </Typography>
        <Stack aria-live="polite" role="status" spacing={2}
          sx={{ alignItems: "center" }}>
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>{translate("courseStructure.detail.loading")}</Typography>
        </Stack>
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseStructure.module.createTitle")}
        </Typography>
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {query.error.status === 404
            ? translate("courseStructure.detail.notFound")
            : translate("courseStructure.status.unavailable")}
        </Alert>
      </Stack>
    );
  }

  const course = query.data;
  const collectionPath = `/admin/courses/${course.id}/modules`;

  return (
    <Stack spacing={3}>
      <AdminCourseBreadcrumbs course={course} trail={[
        { label: translate("courseStructure.module.title"), to: collectionPath },
        { label: translate("courseStructure.module.createTitle") },
      ]} />
      <Typography component="h1" variant="h1">
        {translate("courseStructure.module.createTitle")}
      </Typography>
      <Typography>{translate("courseStructure.module.createDescription")}</Typography>
      {course.state === "archived" ? (
        <>
          <Alert severity="info">
            {translate("courseStructure.module.archivedReadOnly")}
          </Alert>
          <Button component={RouterLink} sx={{ alignSelf: "flex-start" }}
            to={collectionPath}>
            {translate("courseStructure.module.toCollection")}
          </Button>
        </>
      ) : (
        <ModuleCreationForm course={course} headingComponent="h2"
          onSuccess={onSuccess} translate={translate} />
      )}
    </Stack>
  );
}
