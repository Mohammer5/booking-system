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
import { ModuleCards, ModuleTable } from "./ModuleCollectionResults.jsx";
import {
  moduleCollectionFilters,
  moduleCollectionLabels,
  moduleCollectionResultMessages,
  moduleCollectionSorts,
} from "./moduleCollectionPresentation.js";
import { useModuleCollection } from "./useModules.js";

const collectionConfiguration = createAdminCollectionConfiguration({
  searchable: true,
  filters: { state: ["scheduled", "cancelled"] },
  sortFields: ["startsAt", "title", "state"],
  defaultSort: "startsAt.asc",
});

/** @returns {import("react").ReactElement} Course-owned Module collection. */
export function ModuleCollectionPage() {
  const model = useModuleCollectionModel();

  return <ModuleCollectionSurface model={model} />;
}

/** @returns {object} URL collection, query, navigation, and result focus. */
function useModuleCollectionModel() {
  const { courseId } = useParams();
  const { t: translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const collection = useAdminCollectionState(collectionConfiguration);
  const query = useModuleCollection(courseId, collection.state);
  const [deletedModuleTitle] = useState(
    location.state?.moduleDeletedTitle ?? null,
  );
  const deletionSuccessRef = useRef(null);
  const listPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (deletedModuleTitle === null || !query.isSuccess) return;
    deletionSuccessRef.current?.focus();
    navigate(listPath, { replace: true, state: null });
  }, [deletedModuleTitle, listPath, navigate, query.isSuccess]);

  return {
    collection,
    courseId,
    deletedModuleTitle,
    deletionSuccessRef,
    listPath,
    query,
    translate,
  };
}

/** @returns {import("react").ReactElement} Module collection composition. */
function ModuleCollectionSurface({ model }) {
  const course = model.query.data?.course;
  const modules = model.query.data?.modules ?? [];

  return (
    <Paper elevation={2} sx={{ mx: "auto", overflowWrap: "anywhere",
      p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <ModuleCollectionIntroduction course={course} model={model} />
        <ModuleCollectionToolbar model={model} />
        <ModuleCollectionResultState modules={modules} model={model} />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Context, actions, and success. */
function ModuleCollectionIntroduction({ course, model }) {
  return (
    <>
      {course === undefined ? null : (
        <AdminCourseBreadcrumbs course={course}
          trail={[{ label: model.translate("courseStructure.module.title") }]} />
      )}
      <Typography component="h1" variant="h1">
        {model.translate("courseStructure.module.title")}
      </Typography>
      <Typography>{model.translate("courseStructure.module.description")}</Typography>
      {course?.state === "archived" ? (
        <Alert severity="info">
          {model.translate("courseStructure.module.archivedReadOnly")}
        </Alert>
      ) : null}
      {course?.state === "active" ? (
        <Button component={RouterLink} sx={{ alignSelf: "flex-start" }}
          to={`/admin/courses/${model.courseId}/modules/new`} variant="contained">
          {model.translate("courseStructure.module.createAction")}
        </Button>
      ) : null}
      {model.deletedModuleTitle === null ? null : (
        <Alert ref={model.deletionSuccessRef} role="status" severity="success"
          tabIndex={-1}>
          {model.translate("courseStructure.module.deleted", {
            title: model.deletedModuleTitle,
          })}
        </Alert>
      )}
    </>
  );
}

/** @returns {import("react").ReactElement} URL-owned Module controls. */
function ModuleCollectionToolbar({ model }) {
  return <AdminCollectionToolbar
    filters={moduleCollectionFilters(model.translate)}
    hasFilters={model.collection.hasFilters}
    labels={moduleCollectionLabels(model.translate)}
    onFilter={model.collection.setFilter}
    onReset={model.collection.resetFilters}
    onSearch={model.collection.setSearch}
    onSort={model.collection.setSort}
    searchLabel={model.translate("courseStructure.module.search")}
    sorts={moduleCollectionSorts(model.translate)}
    state={model.collection.state}
  />;
}

/** @returns {import("react").ReactElement} Responsive Module result page. */
function ModuleCollectionResultState({ model, modules }) {
  const renderingProps = {
    collection: model.collection,
    courseId: model.courseId,
    listPath: model.listPath,
    modules,
    timezone: model.query.data?.course.timezone,
    translate: model.translate,
  };

  return <AdminCollectionResults
    errorMessage={(error) => moduleReadErrorMessage(error, model.translate)}
    hasFilters={model.collection.hasFilters}
    items={modules}
    messages={moduleCollectionResultMessages(model.translate)}
    onPage={model.collection.setPage}
    onPageSize={model.collection.setPageSize}
    onReset={model.collection.resetFilters}
    query={model.query}
    renderDesktop={() => <ModuleTable {...renderingProps} />}
    renderMobile={() => <ModuleCards {...renderingProps} />}
    state={model.collection.state}
  />;
}

/** @returns {string} Safe unavailable, missing, or technical copy. */
function moduleReadErrorMessage(error, translate) {
  if (error?.status === 404) return translate("courseStructure.detail.notFound");

  return translate(error?.outcome === "technical-error"
    ? "courseStructure.status.technicalError"
    : "courseStructure.status.unavailable");
}
