import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

/**
 * Present one retained Assignment and only its currently permitted action.
 *
 * @param {object} props Assignment, Course, action, and translation properties.
 * @returns {import("react").ReactElement} One responsive membership card.
 */
export function CourseMembershipCard({
  assignment,
  course,
  onAction,
  translate,
}) {
  const participant = assignment.participant;
  const isParticipantActive = participant.state === "active";
  const action = permittedAction(assignment.state, course.state);

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
          {action === null ? (
            <Typography color="text.secondary" variant="body2">
              {translate("courseAccess.lifecycle.archivedReactivationUnavailable")}
            </Typography>
          ) : (
            <Button
              color={action === "revoke" ? "error" : "primary"}
              onClick={(event) => onAction(action, assignment, event.currentTarget)}
              sx={{ alignSelf: "flex-start" }}
              variant="outlined"
            >
              {translate(`courseAccess.lifecycle.${action}Action`)}
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {"revoke" | "reactivate" | null} Current permitted action. */
function permittedAction(assignmentState, courseState) {
  if (assignmentState === "active") {
    return "revoke";
  }

  return courseState === "active" ? "reactivate" : null;
}
