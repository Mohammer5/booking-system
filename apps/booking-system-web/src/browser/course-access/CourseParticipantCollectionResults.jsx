import {
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router";

import { AdminCollectionSortLabel } from "../admin-collections/index.js";

/** @returns {import("react").ReactElement} Wide Course Participant table. */
export function CourseParticipantTable(props) {
  const heading = (field) => (
    <AdminCollectionSortLabel field={field}
      onSort={props.collection.toggleSort} state={props.collection.state}>
      {props.translate(`courseAccess.courseParticipants.fields.${field}`)}
    </AdminCollectionSortLabel>
  );

  return (
    <TableContainer>
      <Table aria-label={props.translate("courseAccess.courseParticipants.tableLabel")}>
        <TableHead>
          <TableRow>
            {['name', 'email', 'participantState', 'assignmentState'].map((field) => (
              <TableCell key={field} sortDirection={sortDirection(
                props.collection,
                field,
              )}>{heading(field)}</TableCell>
            ))}
            <TableCell>
              {props.translate("courseAccess.courseParticipants.fields.action")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell component="th" scope="row">
                {assignment.participant.name}
              </TableCell>
              <TableCell>{assignment.participant.email}</TableCell>
              <TableCell><ParticipantState assignment={assignment} {...props} /></TableCell>
              <TableCell><AssignmentState assignment={assignment} {...props} /></TableCell>
              <TableCell><DetailLink assignment={assignment} {...props} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow Course Participant cards. */
export function CourseParticipantCards(props) {
  return (
    <List aria-label={props.translate("courseAccess.courseParticipants.listLabel")}
      disablePadding>
      {props.assignments.map((assignment) => (
        <ListItem disablePadding key={assignment.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h3">
                  {assignment.participant.name}
                </Typography>
                <Typography sx={{ overflowWrap: "anywhere" }}>
                  {assignment.participant.email}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <ParticipantState assignment={assignment} {...props} />
                  <AssignmentState assignment={assignment} {...props} />
                </Stack>
                <DetailLink assignment={assignment} {...props} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} Explicit Participant state. */
function ParticipantState({ assignment, translate }) {
  const state = assignment.participant.state;

  return <Chip label={translate(`courseAccess.participantState.${state}`)}
    variant={state === "active" ? "filled" : "outlined"} />;
}

/** @returns {import("react").ReactElement} Explicit Assignment state. */
function AssignmentState({ assignment, translate }) {
  return <Chip label={translate(
    `courseAccess.assignmentState.${assignment.state}`,
  )} variant={assignment.state === "active" ? "filled" : "outlined"} />;
}

/** @returns {import("react").ReactElement} Stable explicit detail link. */
function DetailLink({ assignment, courseId, listPath, translate }) {
  return (
    <Button component={RouterLink}
      state={{ courseParticipantCollectionPath: listPath }}
      sx={{ alignSelf: "flex-start" }}
      to={`/admin/courses/${courseId}/participants/${assignment.participant.id}`}
      variant="outlined">
      {translate("courseAccess.courseParticipants.detailAction")}
    </Button>
  );
}

/** @returns {"asc" | "desc" | false} Current semantic sort direction. */
function sortDirection(collection, field) {
  return collection.state.sortField === field
    ? collection.state.sortDirection
    : false;
}
