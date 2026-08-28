import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseAssignmentDialog } from "./CourseAssignmentDialog.jsx";
import { useCourseAssignments } from "./useCourseAccess.js";

/**
 * Present one Course's current membership and direct Assignment action.
 *
 * @param {object} props Course membership properties.
 * @returns {import("react").ReactElement} Course membership section.
 */
export function CourseMembershipSection({ course }) {
  const { t } = useTranslation();
  const state = useCourseMembershipState(course.id);

  return <CourseMembershipSurface course={course} state={state} translate={t} />;
}

/**
 * Own membership loading, dialog visibility, and predictable success focus.
 *
 * @param {string} courseId Stable Course identity.
 * @returns {object} Course membership presentation state.
 */
function useCourseMembershipState(courseId) {
  const assignments = useCourseAssignments(courseId);
  const errorRef = useRef(null);
  const openerRef = useRef(null);
  const successRef = useRef(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);

  useEffect(() => {
    if (assignmentResult !== null && !isDialogOpen) {
      successRef.current?.focus();
    }
  }, [assignmentResult, isDialogOpen]);

  useEffect(() => {
    if (assignments.isError) {
      errorRef.current?.focus();
    }
  }, [assignments.isError]);

  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  const acceptAssignment = (result) => {
    setAssignmentResult(result);
    setIsDialogOpen(false);
  };

  return {
    acceptAssignment,
    assignmentResult,
    assignments,
    closeDialog,
    errorRef,
    isDialogOpen,
    openDialog: () => {
      setAssignmentResult(null);
      setIsDialogOpen(true);
    },
    openerRef,
    successRef,
  };
}

/**
 * Compose membership heading, result, list, and dialog regions.
 *
 * @param {object} props Course data and membership presentation state.
 * @returns {import("react").ReactElement} Course membership surface.
 */
function CourseMembershipSurface({ course, state, translate }) {
  return (
    <Stack aria-labelledby="course-membership-title" component="section" spacing={3}>
      <MembershipHeading
        isCourseActive={course.state === "active"}
        onOpen={state.openDialog}
        openerRef={state.openerRef}
        translate={translate}
      />
      <MembershipSuccess state={state} translate={translate} />
      <CourseMembershipState
        assignmentQuery={state.assignments}
        errorRef={state.errorRef}
        translate={translate}
      />
      <MembershipDialog courseId={course.id} state={state} />
    </Stack>
  );
}

/**
 * Present the section title and direct Assignment action.
 *
 * @param {object} props Heading properties.
 * @returns {import("react").ReactElement} Responsive membership heading.
 */
function MembershipHeading({ isCourseActive, onOpen, openerRef, translate }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
    >
      <Typography component="h2" id="course-membership-title" variant="h2">
        {translate("courseAccess.membership.title")}
      </Typography>
      <Button
        aria-haspopup="dialog"
        disabled={!isCourseActive}
        onClick={onOpen}
        ref={openerRef}
        variant="contained"
      >
        {translate("courseAccess.membership.assign")}
      </Button>
    </Stack>
  );
}

/**
 * Present the created or idempotent Assignment result.
 *
 * @param {object} props Result presentation properties.
 * @returns {import("react").ReactElement | null} Focusable success status.
 */
function MembershipSuccess({ state, translate }) {
  if (state.assignmentResult === null) {
    return null;
  }

  return (
    <Alert ref={state.successRef} role="status" severity="success" tabIndex={-1}>
      {translate(
        state.assignmentResult.isCreated
          ? "courseAccess.membership.created"
          : "courseAccess.membership.alreadyActive",
      )}
    </Alert>
  );
}

/**
 * Mount the Assignment dialog only with a resolved membership collection.
 *
 * @param {object} props Dialog composition properties.
 * @returns {import("react").ReactElement | null} Current Assignment dialog.
 */
function MembershipDialog({ courseId, state }) {
  if (!state.isDialogOpen || !state.assignments.isSuccess) {
    return null;
  }

  return (
    <CourseAssignmentDialog
      assignments={state.assignments.data.assignments}
      courseId={courseId}
      onCancel={state.closeDialog}
      onSuccess={state.acceptAssignment}
    />
  );
}

/**
 * Present loading, unavailable, empty, or populated Course membership state.
 *
 * @param {object} props Membership state properties.
 * @returns {import("react").ReactElement} Current membership state.
 */
function CourseMembershipState({ assignmentQuery, errorRef, translate }) {
  if (assignmentQuery.isPending) {
    return (
      <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>{translate("courseAccess.membership.loading")}</Typography>
      </Stack>
    );
  }

  if (assignmentQuery.isError) {
    return (
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {membershipErrorMessage(assignmentQuery.error, translate)}
      </Alert>
    );
  }

  if (assignmentQuery.data.assignments.length === 0) {
    return (
      <Alert role="status" severity="info">
        {translate("courseAccess.membership.empty")}
      </Alert>
    );
  }

  return (
    <MembershipList
      assignments={assignmentQuery.data.assignments}
      translate={translate}
    />
  );
}

/**
 * Present current Course Assignments in deterministic Participant order.
 *
 * @param {object} props Membership list properties.
 * @returns {import("react").ReactElement} Semantic membership list.
 */
function MembershipList({ assignments, translate }) {
  return (
    <List aria-label={translate("courseAccess.membership.listLabel")} disablePadding>
      {assignments.map((assignment) => (
        <ListItem disablePadding key={assignment.id} sx={{ mb: 2 }}>
          <MembershipCard assignment={assignment} translate={translate} />
        </ListItem>
      ))}
    </List>
  );
}

/**
 * Present one Assignment with distinct Participant and membership states.
 *
 * @param {object} props Membership card properties.
 * @returns {import("react").ReactElement} One membership card.
 */
function MembershipCard({ assignment, translate }) {
  const participant = assignment.participant;
  const isParticipantActive = participant.state === "active";

  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography component="h3" variant="h3">
            {participant.name}
          </Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>
            {participant.email}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip
              color={isParticipantActive ? "success" : "default"}
              label={translate(`courseAccess.participantState.${participant.state}`)}
              variant={isParticipantActive ? "filled" : "outlined"}
            />
            <Chip
              color={assignment.state === "active" ? "success" : "default"}
              label={translate(`courseAccess.assignmentState.${assignment.state}`)}
              variant="outlined"
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Map one membership read failure to localized presentation.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized error copy.
 */
function membershipErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
    "course-not-found",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseAccess.status.unavailable")
    : translate("courseAccess.status.technicalError");
}
