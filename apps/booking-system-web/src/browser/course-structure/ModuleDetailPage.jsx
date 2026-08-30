import { Alert, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";

import { AdminCourseBreadcrumbs } from "./AdminCourseBreadcrumbs.jsx";
import { ModuleManagementCard } from "./ModuleManagementCard.jsx";
import { useModuleDetail } from "./useModules.js";

/** @returns {import("react").ReactElement} Stable Course Module detail route. */
export function ModuleDetailPage() {
  const { courseId, moduleId } = useParams();
  const { t: translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useModuleDetail(courseId, moduleId);
  const errorRef = useRef(null);
  const creationSuccessRef = useRef(null);
  const [showCreationSuccess] = useState(location.state?.moduleCreated === true);
  const listPath = safeModuleListPath(
    location.state?.moduleCollectionPath,
    courseId,
  );

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);
  useEffect(() => {
    if (!showCreationSuccess || !query.isSuccess) return;
    creationSuccessRef.current?.focus();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, query.isSuccess, showCreationSuccess]);

  return (
    <Paper elevation={2} sx={{ maxWidth: "56rem", mx: "auto",
      overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <ModuleDetailState creationSuccessRef={creationSuccessRef}
          errorRef={errorRef} listPath={listPath}
          onDeleted={(result) => navigate(listPath, {
            state: { moduleDeletedTitle: result.module.title },
          })}
          query={query} showCreationSuccess={showCreationSuccess}
          translate={translate} />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Loading, failure, or Module detail. */
function ModuleDetailState(props) {
  if (props.query.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {props.translate("courseStructure.module.detailTitle")}
        </Typography>
        <Stack aria-live="polite" role="status" spacing={2}
          sx={{ alignItems: "center" }}>
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>
            {props.translate("courseStructure.module.detailLoading")}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  if (props.query.isError) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {props.translate("courseStructure.module.detailTitle")}
        </Typography>
        <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
          {props.query.error.status === 404
            ? props.translate("courseStructure.module.notFound")
            : props.translate("courseStructure.status.unavailable")}
        </Alert>
      </Stack>
    );
  }

  const { course, module } = props.query.data;

  return (
    <Stack spacing={3}>
      <AdminCourseBreadcrumbs course={course} trail={[
        {
          label: props.translate("courseStructure.module.title"),
          to: props.listPath,
        },
        { label: module.title },
      ]} />
      {props.showCreationSuccess ? (
        <Alert ref={props.creationSuccessRef} role="status" severity="success"
          tabIndex={-1}>
          {props.translate("courseStructure.module.success")}
        </Alert>
      ) : null}
      {course.state === "archived" ? (
        <Alert severity="info">
          {props.translate("courseStructure.module.archivedReadOnly")}
        </Alert>
      ) : null}
      <ModuleManagementCard course={course} headingComponent="h1"
        isReadOnly={course.state === "archived"} module={module}
        onDeleted={props.onDeleted} translate={props.translate} />
    </Stack>
  );
}

/** @returns {string} Safe exact collection return target. */
function safeModuleListPath(candidate, courseId) {
  const base = `/admin/courses/${courseId}/modules`;

  return candidate === base || candidate?.startsWith(`${base}?`)
    ? candidate
    : base;
}
