import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";

import {
  AdminCollectionResults,
  AdminCollectionToolbar,
  createAdminCollectionConfiguration,
  useAdminCollectionState,
} from "../admin-collections/index.js";
import { AdminCourseBreadcrumbs } from "../course-structure/index.js";
import { AdminParticipationParticipantDialog } from "./AdminParticipationParticipantDialog.jsx";
import { CourseAssignmentDialog } from "./CourseAssignmentDialog.jsx";
import {
  CourseParticipantCards,
  CourseParticipantTable,
} from "./CourseParticipantCollectionResults.jsx";
import {
  courseParticipantCollectionLabels,
  courseParticipantFilters,
  courseParticipantResultMessages,
  courseParticipantSorts,
} from "./courseParticipantCollectionPresentation.js";
import { useCourseAssignments } from "./useCourseAccess.js";

const collectionConfiguration = createAdminCollectionConfiguration({
  searchable: true,
  filters: {
    participantState: ["active", "disabled"],
    assignmentState: ["active", "revoked"],
  },
  sortFields: ["name", "email", "participantState", "assignmentState"],
  defaultSort: "name.asc",
});

/** @returns {import("react").ReactElement} Course Participant collection. */
export function CourseParticipantCollectionPage() {
  const model = useCourseParticipantCollectionModel();

  return <CourseParticipantCollectionSurface model={model} />;
}

/** @returns {object} URL, query, dialogs, navigation, and result focus. */
function useCourseParticipantCollectionModel() {
  const { courseId } = useParams();
  const { t: translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const collection = useAdminCollectionState(collectionConfiguration);
  const query = useCourseAssignments(courseId, collection.state);
  const [dialog, setDialog] = useState(null);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const successRef = useRef(null);
  const listPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (assignmentResult !== null && dialog === null) {
      successRef.current?.focus();
    }
  }, [assignmentResult, dialog]);

  return {
    assignmentResult,
    collection,
    courseId,
    dialog,
    listPath,
    navigate,
    openDialog(kind) {
      setAssignmentResult(null);
      setDialog(kind);
    },
    query,
    setAssignmentResult,
    setDialog,
    successRef,
    translate,
  };
}

/** @returns {import("react").ReactElement} Collection page composition. */
function CourseParticipantCollectionSurface({ model }) {
  const assignments = model.query.data?.assignments ?? [];
  const course = model.query.data?.course;

  return (
    <Paper elevation={2} sx={{ mx: "auto", overflowWrap: "anywhere",
      p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <CollectionIntroduction course={course} model={model} />
        <CollectionToolbar model={model} />
        <CollectionResults assignments={assignments} model={model} />
      </Stack>
      <CollectionDialogs model={model} />
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Heading, actions, and feedback. */
function CollectionIntroduction({ course, model }) {
  const { translate } = model;

  return (
    <>
      {course === undefined ? null : (
        <AdminCourseBreadcrumbs course={course}
          trail={[{ label: translate("courseAccess.courseParticipants.title") }]} />
      )}
      <Stack spacing={1}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.courseParticipants.title")}
        </Typography>
        <Typography>{translate("courseAccess.courseParticipants.description")}</Typography>
      </Stack>
      {course?.state === "archived" ? (
        <Alert severity="info">
          {translate("courseAccess.membership.archivedReadOnly")}
        </Alert>
      ) : null}
      {course?.state === "active" ? <CollectionActions model={model} /> : null}
      {model.assignmentResult === null ? null : (
        <Alert ref={model.successRef} role="status" severity="success" tabIndex={-1}>
          {translate(`courseAccess.membership.${model.assignmentResult.outcome}`)}
        </Alert>
      )}
    </>
  );
}

/** @returns {import("react").ReactElement} Direct and assisted entry points. */
function CollectionActions({ model }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <Button onClick={() => model.openDialog("assignment")} variant="contained">
        {model.translate("courseAccess.membership.assign")}
      </Button>
      <Button onClick={() => model.openDialog("assisted")} variant="outlined">
        {model.translate(
          "courseAccess.adminParticipation.participants.manageSelection",
        )}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} URL-owned controls. */
function CollectionToolbar({ model }) {
  return <AdminCollectionToolbar
    filters={courseParticipantFilters(model.translate)}
    hasFilters={model.collection.hasFilters}
    labels={courseParticipantCollectionLabels(model.translate)}
    onFilter={model.collection.setFilter}
    onReset={model.collection.resetFilters}
    onSearch={model.collection.setSearch}
    onSort={model.collection.setSort}
    searchLabel={model.translate("courseAccess.courseParticipants.search")}
    sorts={courseParticipantSorts(model.translate)}
    state={model.collection.state}
  />;
}

/** @returns {import("react").ReactElement} Responsive Assignment results. */
function CollectionResults({ assignments, model }) {
  const renderingProps = {
    assignments,
    collection: model.collection,
    courseId: model.courseId,
    listPath: model.listPath,
    translate: model.translate,
  };

  return <AdminCollectionResults
    errorMessage={(error) => collectionErrorMessage(error, model.translate)}
    hasFilters={model.collection.hasFilters}
    items={assignments}
    messages={courseParticipantResultMessages(model.translate)}
    onPage={model.collection.setPage}
    onPageSize={model.collection.setPageSize}
    onReset={model.collection.resetFilters}
    query={model.query}
    renderDesktop={() => <CourseParticipantTable {...renderingProps} />}
    renderMobile={() => <CourseParticipantCards {...renderingProps} />}
    state={model.collection.state}
  />;
}

/** @returns {import("react").ReactElement} Incidental picker Dialogs. */
function CollectionDialogs({ model }) {
  if (model.dialog === "assignment") {
    return <CourseAssignmentDialog courseId={model.courseId}
      onCancel={() => model.setDialog(null)}
      onSuccess={(result) => {
        model.setAssignmentResult(result);
        model.setDialog(null);
      }} />;
  }

  return model.dialog === "assisted" ? (
    <AdminParticipationParticipantDialog courseId={model.courseId}
      onClose={() => model.setDialog(null)}
      onSelect={(participantId) => {
        model.setDialog(null);
        model.navigate(
          `/admin/courses/${model.courseId}/participants/${participantId}`,
          { state: { courseParticipantCollectionPath: model.listPath } },
        );
      }} translate={model.translate} />
  ) : null;
}

/** @returns {string} Safe collection failure copy. */
function collectionErrorMessage(error, translate) {
  return translate(error?.outcome === "technical-error"
    ? "courseAccess.status.technicalError"
    : "courseAccess.status.unavailable");
}
