import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import {
  AdminCollectionResults,
  AdminCollectionToolbar,
  createAdminCollectionConfiguration,
  useAdminCollectionState,
} from "../admin-collections/index.js";
import { AdminCourseBreadcrumbs } from "./AdminCourseBreadcrumbs.jsx";
import { GroupCards, GroupTable } from "./GroupCollectionResults.jsx";
import {
  groupCollectionFilters,
  groupCollectionLabels,
  groupCollectionResultMessages,
  groupCollectionSorts,
} from "./groupCollectionPresentation.js";
import { useGroupCollection } from "./useGroups.js";

const collectionConfiguration = createAdminCollectionConfiguration({
  searchable: true,
  filters: { state: ["active", "archived"] },
  sortFields: ["name", "state"],
  defaultSort: "name.asc",
});

/** @returns {import("react").ReactElement} Course-owned Group collection. */
export function GroupCollectionPage() {
  const model = useGroupCollectionModel();

  return <GroupCollectionSurface model={model} />;
}

/** @returns {object} URL collection, query, navigation, and result focus. */
function useGroupCollectionModel() {
  const { courseId } = useParams();
  const { t: translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const collection = useAdminCollectionState(collectionConfiguration);
  const query = useGroupCollection(courseId, collection.state);
  const [deletedGroupName] = useState(location.state?.groupDeletedName ?? null);
  const deletionSuccessRef = useRef(null);
  const listPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (deletedGroupName === null || !query.isSuccess) return;
    deletionSuccessRef.current?.focus();
    navigate(listPath, { replace: true, state: null });
  }, [deletedGroupName, listPath, navigate, query.isSuccess]);

  return {
    collection,
    courseId,
    deletedGroupName,
    deletionSuccessRef,
    listPath,
    query,
    translate,
  };
}

/** @returns {import("react").ReactElement} Group collection composition. */
function GroupCollectionSurface({ model }) {
  const course = model.query.data?.course;
  const groups = model.query.data?.groups ?? [];

  return (
    <Paper elevation={2} sx={{ mx: "auto", overflowWrap: "anywhere",
      p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <GroupCollectionIntroduction course={course} model={model} />
        <GroupCollectionToolbar model={model} />
        <GroupCollectionResults groups={groups} model={model} />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Context, actions, and success. */
function GroupCollectionIntroduction({ course, model }) {
  return (
    <>
      {course === undefined ? null : (
        <AdminCourseBreadcrumbs course={course}
          trail={[{ label: model.translate("courseStructure.group.title") }]} />
      )}
      <Typography component="h1" variant="h1">
        {model.translate("courseStructure.group.title")}
      </Typography>
      <Typography>{model.translate("courseStructure.group.description")}</Typography>
      {course?.state === "archived" ? (
        <Alert severity="info">
          {model.translate("courseStructure.group.archivedReadOnly")}
        </Alert>
      ) : null}
      {course?.state === "active" ? (
        <Button component={RouterLink} sx={{ alignSelf: "flex-start" }}
          to={`/admin/courses/${model.courseId}/groups/new`} variant="contained">
          {model.translate("courseStructure.group.createAction")}
        </Button>
      ) : null}
      {model.deletedGroupName === null ? null : (
        <Alert ref={model.deletionSuccessRef} role="status" severity="success"
          tabIndex={-1}>
          {model.translate("courseStructure.group.deleted", {
            name: model.deletedGroupName,
          })}
        </Alert>
      )}
    </>
  );
}

/** @returns {import("react").ReactElement} URL-owned Group controls. */
function GroupCollectionToolbar({ model }) {
  return <AdminCollectionToolbar
    filters={groupCollectionFilters(model.translate)}
    hasFilters={model.collection.hasFilters}
    labels={groupCollectionLabels(model.translate)}
    onFilter={model.collection.setFilter}
    onReset={model.collection.resetFilters}
    onSearch={model.collection.setSearch}
    onSort={model.collection.setSort}
    searchLabel={model.translate("courseStructure.group.search")}
    sorts={groupCollectionSorts(model.translate)}
    state={model.collection.state}
  />;
}

/** @returns {import("react").ReactElement} Responsive Group collection page. */
function GroupCollectionResults({ groups, model }) {
  const renderingProps = {
    collection: model.collection,
    courseId: model.courseId,
    groups,
    listPath: model.listPath,
    translate: model.translate,
  };

  return <AdminCollectionResults
    errorMessage={(error) => groupReadErrorMessage(error, model.translate)}
    hasFilters={model.collection.hasFilters}
    items={groups}
    messages={groupCollectionResultMessages(model.translate)}
    onPage={model.collection.setPage}
    onPageSize={model.collection.setPageSize}
    onReset={model.collection.resetFilters}
    query={model.query}
    renderDesktop={() => <GroupTable {...renderingProps} />}
    renderMobile={() => <GroupCards {...renderingProps} />}
    state={model.collection.state}
  />;
}

/** @returns {string} Safe unavailable, missing, or technical copy. */
function groupReadErrorMessage(error, translate) {
  if (error?.status === 404) return translate("courseStructure.detail.notFound");

  return translate(error?.outcome === "technical-error"
    ? "courseStructure.status.technicalError"
    : "courseStructure.status.unavailable");
}
