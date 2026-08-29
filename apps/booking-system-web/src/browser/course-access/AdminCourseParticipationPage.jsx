import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router";

import { AdministrativeCourseStructure } from "./AdministrativeCourseStructure.jsx";
import { AdminParticipationParticipantDialog } from "./AdminParticipationParticipantDialog.jsx";
import { administrativeParticipationErrorMessage } from "./administrativeParticipationErrorMessage.js";
import { useAdministrativeCourseParticipation } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Admin Course participation overview. */
export function AdminCourseParticipationPage() {
  const { courseId } = useParams();
  const query = useAdministrativeCourseParticipation(courseId);
  const errorRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

  return (
    <ParticipationPageFrame courseId={courseId} translate={t}>
      <ParticipationPageState
        errorRef={errorRef}
        query={query}
        translate={t}
      />
    </ParticipationPageFrame>
  );
}

/** @returns {import("react").ReactElement} Stable Course-context page frame. */
function ParticipationPageFrame({ children, courseId, translate }) {
  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: "76rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack component="section" spacing={3}>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to={`/admin/courses/${courseId}`}
        >
          {translate("courseAccess.adminParticipation.toCourse")}
        </Button>
        {children}
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Loading, failure, or overview. */
function ParticipationPageState({ errorRef, query, translate }) {
  if (query.isPending) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.adminParticipation.title")}
        </Typography>
        <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>
            {translate("courseAccess.adminParticipation.loading")}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("courseAccess.adminParticipation.title")}
        </Typography>
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {administrativeParticipationErrorMessage(query.error, translate)}
        </Alert>
      </Stack>
    );
  }

  return <ParticipationOverview data={query.data} translate={translate} />;
}

/** @returns {import("react").ReactElement} Complete normalized overview. */
function ParticipationOverview({ data, translate }) {
  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography component="h1" variant="h1">
          {data.course.name}
        </Typography>
        <Chip
          label={translate(`courseStructure.state.${data.course.state}`)}
          variant={data.course.state === "active" ? "filled" : "outlined"}
        />
      </Stack>
      <Typography>
        {translate("courseAccess.adminParticipation.description")}
      </Typography>
      {data.course.state === "archived" ? (
        <Alert severity="info">
          {translate("courseAccess.adminParticipation.archived")}
        </Alert>
      ) : null}
      <ParticipationDirectory data={data} translate={translate} />
      <AdministrativeCourseStructure data={data} translate={translate} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Responsive Participant overview. */
function ParticipationDirectory({ data, translate }) {
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);

  return (
    <Stack aria-labelledby="admin-participation-participants" component="section" spacing={2}>
      <Typography component="h2" id="admin-participation-participants" variant="h2">
        {translate("courseAccess.adminParticipation.participants.title")}
      </Typography>
      <Typography>
        {translate("courseAccess.adminParticipation.participants.assistedDescription")}
      </Typography>
      <Button
        onClick={() => setIsTargetDialogOpen(true)}
        sx={{ alignSelf: "flex-start" }}
        variant="contained"
      >
        {translate("courseAccess.adminParticipation.participants.manageSelection")}
      </Button>
      {data.participations.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.adminParticipation.participants.empty")}
        </Alert>
      ) : (
        <>
          <ParticipationTable data={data} translate={translate} />
          <ParticipationCards data={data} translate={translate} />
        </>
      )}
      {isTargetDialogOpen ? (
        <AdminParticipationParticipantDialog
          courseId={data.course.id}
          onClose={() => setIsTargetDialogOpen(false)}
          participations={data.participations}
          translate={translate}
        />
      ) : null}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Wide semantic participation table. */
function ParticipationTable({ data, translate }) {
  return (
    <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
      <Table aria-label={translate("courseAccess.adminParticipation.participants.tableLabel")}>
        <TableHead>
          <TableRow>
            <TableCell>{translate("courseAccess.adminParticipation.participants.participant")}</TableCell>
            <TableCell>{translate("courseAccess.adminParticipation.participants.email")}</TableCell>
            <TableCell>{translate("courseAccess.adminParticipation.participants.profileState")}</TableCell>
            <TableCell>{translate("courseAccess.adminParticipation.participants.assignmentState")}</TableCell>
            <TableCell>
              {translate("courseAccess.adminParticipation.participants.action")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.participations.map((participation) => (
            <TableRow key={participation.assignment.id}>
              <TableCell component="th" scope="row">
                {participation.participant.name}
              </TableCell>
              <TableCell>{participation.participant.email}</TableCell>
              <TableCell>
                <ParticipantState participation={participation} translate={translate} />
              </TableCell>
              <TableCell>
                <AssignmentState participation={participation} translate={translate} />
              </TableCell>
              <TableCell align="right">
                <DetailLink data={data} participation={participation} translate={translate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow semantic card alternative. */
function ParticipationCards({ data, translate }) {
  return (
    <List
      aria-label={translate(
        "courseAccess.adminParticipation.participants.tableLabel",
      )}
      disablePadding
      sx={{ display: { xs: "block", md: "none" } }}
    >
      {data.participations.map((participation) => (
        <ListItem disablePadding key={participation.assignment.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h3" variant="h3">
                  {participation.participant.name}
                </Typography>
                <Typography>{participation.participant.email}</Typography>
                <ParticipantState participation={participation} translate={translate} />
                <AssignmentState participation={participation} translate={translate} />
                <DetailLink data={data} participation={participation} translate={translate} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} Textual Participant state. */
function ParticipantState({ participation, translate }) {
  return (
    <Chip
      label={translate(
        `courseAccess.participantState.${participation.participant.state}`,
      )}
      variant={participation.participant.state === "active" ? "filled" : "outlined"}
    />
  );
}

/** @returns {import("react").ReactElement} Textual Assignment state. */
function AssignmentState({ participation, translate }) {
  return (
    <Chip
      label={translate(
        `courseAccess.assignmentState.${participation.assignment.state}`,
      )}
      variant={participation.assignment.state === "active" ? "filled" : "outlined"}
    />
  );
}

/** @returns {import("react").ReactElement} Stable Participant detail link. */
function DetailLink({ data, participation, translate }) {
  return (
    <Button
      component={RouterLink}
      sx={{ alignSelf: "flex-start" }}
      to={`/admin/courses/${data.course.id}/participation/${participation.participant.id}`}
      variant="outlined"
    >
      {translate("courseAccess.adminParticipation.participants.detail")}
    </Button>
  );
}
