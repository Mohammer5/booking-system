import { Alert, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";

import { AdminCourseBreadcrumbs } from "./AdminCourseBreadcrumbs.jsx";
import { GroupManagementCard } from "./GroupManagementCard.jsx";
import { useGroupDetail } from "./useGroups.js";

/** @returns {import("react").ReactElement} Stable Course Group detail route. */
export function GroupDetailPage() {
  const { courseId, groupId } = useParams();
  const { t: translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useGroupDetail(courseId, groupId);
  const errorRef = useRef(null);
  const creationSuccessRef = useRef(null);
  const [showCreationSuccess] = useState(location.state?.groupCreated === true);
  const listPath = safeGroupListPath(location.state?.groupCollectionPath, courseId);

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
        <GroupDetailState creationSuccessRef={creationSuccessRef}
          errorRef={errorRef} listPath={listPath}
          onDeleted={(result) => navigate(listPath, {
            state: { groupDeletedName: result.group.name },
          })}
          query={query} showCreationSuccess={showCreationSuccess}
          translate={translate} />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Loading, failure, or Group detail. */
function GroupDetailState(props) {
  if (props.query.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {props.translate("courseStructure.group.detailTitle")}
        </Typography>
        <Stack aria-live="polite" role="status" spacing={2}
          sx={{ alignItems: "center" }}>
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>{props.translate("courseStructure.group.detailLoading")}</Typography>
        </Stack>
      </Stack>
    );
  }

  if (props.query.isError) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {props.translate("courseStructure.group.detailTitle")}
        </Typography>
        <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
          {props.query.error.status === 404
            ? props.translate("courseStructure.group.notFound")
            : props.translate("courseStructure.status.unavailable")}
        </Alert>
      </Stack>
    );
  }

  const { course, group } = props.query.data;

  return (
    <Stack spacing={3}>
      <AdminCourseBreadcrumbs course={course} trail={[
        {
          label: props.translate("courseStructure.group.title"),
          to: props.listPath,
        },
        { label: group.name },
      ]} />
      {props.showCreationSuccess ? (
        <Alert ref={props.creationSuccessRef} role="status" severity="success"
          tabIndex={-1}>
          {props.translate("courseStructure.group.success")}
        </Alert>
      ) : null}
      {course.state === "archived" ? (
        <Alert severity="info">
          {props.translate("courseStructure.group.archivedReadOnly")}
        </Alert>
      ) : null}
      <GroupManagementCard courseId={course.id} group={group}
        headingComponent="h1" isReadOnly={course.state === "archived"}
        onDeleted={props.onDeleted} translate={props.translate} />
    </Stack>
  );
}

/** @returns {string} Safe exact collection return target. */
function safeGroupListPath(candidate, courseId) {
  const base = `/admin/courses/${courseId}/groups`;

  return candidate === base || candidate?.startsWith(`${base}?`)
    ? candidate
    : base;
}
