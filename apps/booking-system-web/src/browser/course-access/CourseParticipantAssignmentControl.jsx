import { Alert, Button, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { CourseAssignmentLifecycleDialog } from "./CourseAssignmentLifecycleDialog.jsx";

/** @returns {import("react").ReactElement} Detail-owned Assignment lifecycle. */
export function CourseParticipantAssignmentControl(props) {
  const [action, setAction] = useState(null);
  const [result, setResult] = useState(null);
  const successRef = useRef(null);
  const availableAction = assignmentAction(
    props.participation.assignment,
    props.course.state,
  );

  useEffect(() => {
    if (result !== null && action === null) successRef.current?.focus();
  }, [action, result]);

  return (
    <Stack aria-labelledby="course-participant-assignment" component="section"
      spacing={2}>
      <Typography component="h2" id="course-participant-assignment" variant="h2">
        {props.translate("courseAccess.courseParticipants.detail.assignmentTitle")}
      </Typography>
      {result === null ? null : (
        <Alert ref={successRef} role="status" severity="success" tabIndex={-1}>
          {props.translate(`courseAccess.membership.${result.outcome}`)}
        </Alert>
      )}
      {availableAction === null ? (
        <Alert severity="info">
          {props.translate(
            "courseAccess.courseParticipants.detail.assignmentReadOnly",
          )}
        </Alert>
      ) : (
        <Button color={availableAction === "revoke" ? "error" : "primary"}
          onClick={() => {
            setResult(null);
            setAction(availableAction);
          }} sx={{ alignSelf: "flex-start" }} variant="outlined">
          {props.translate(`courseAccess.lifecycle.${availableAction}Action`)}
        </Button>
      )}
      {action === null ? null : (
        <CourseAssignmentLifecycleDialog
          action={action}
          assignment={{
            ...props.participation.assignment,
            participant: props.participation.participant,
          }}
          courseId={props.course.id}
          onCancel={() => setAction(null)}
          onSuccess={(nextResult) => {
            setResult(nextResult);
            setAction(null);
          }}
        />
      )}
    </Stack>
  );
}

/** @returns {"assign" | "reactivate" | "revoke" | null} Current action. */
function assignmentAction(assignment, courseState) {
  if (assignment?.state === "active") return "revoke";
  if (courseState === "archived") return null;
  return assignment === null ? "assign" : "reactivate";
}
