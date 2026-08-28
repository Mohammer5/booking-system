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
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import { useParticipantDirectory } from "./useCourseAccess.js";

/**
 * Present the directly navigable global Participant administration directory.
 *
 * @returns {import("react").ReactElement} Participant directory route.
 */
export function ParticipantDirectoryPage() {
  const { t } = useTranslation();
  const participantQuery = useParticipantDirectory();
  const errorRef = useRef(null);

  useEffect(() => {
    if (participantQuery.isError) {
      errorRef.current?.focus();
    }
  }, [participantQuery.isError]);

  return (
    <Paper
      elevation={2}
      sx={{ mx: "auto", overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}
    >
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {t("courseAccess.directory.title")}
        </Typography>
        <Typography>{t("courseAccess.directory.description")}</Typography>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin"
        >
          {t("courseAccess.navigation.toAdministration")}
        </Button>
        <ParticipantDirectoryState
          errorRef={errorRef}
          participantQuery={participantQuery}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/**
 * Present loading, unavailable, empty, or populated directory state.
 *
 * @param {object} props Directory state properties.
 * @returns {import("react").ReactElement} Current Participant directory state.
 */
function ParticipantDirectoryState({ errorRef, participantQuery, translate }) {
  if (participantQuery.isPending) {
    return (
      <Stack
        aria-live="polite"
        role="status"
        spacing={2}
        sx={{ alignItems: "center" }}
      >
        <CircularProgress aria-hidden="true" size={36} />
        <Typography>{translate("courseAccess.directory.loading")}</Typography>
      </Stack>
    );
  }

  if (participantQuery.isError) {
    return (
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {courseAccessErrorMessage(participantQuery.error, translate)}
      </Alert>
    );
  }

  if (participantQuery.data.participants.length === 0) {
    return (
      <Alert role="status" severity="info">
        {translate("courseAccess.directory.empty")}
      </Alert>
    );
  }

  return (
    <ParticipantList
      participants={participantQuery.data.participants}
      translate={translate}
    />
  );
}

/**
 * Present every fully registered Participant in deterministic order.
 *
 * @param {object} props Participant list properties.
 * @returns {import("react").ReactElement} Semantic Participant list.
 */
function ParticipantList({ participants, translate }) {
  return (
    <List
      aria-label={translate("courseAccess.directory.listLabel")}
      disablePadding
    >
      {participants.map((participant) => (
        <ListItem disablePadding key={participant.id} sx={{ mb: 2 }}>
          <ParticipantCard participant={participant} translate={translate} />
        </ListItem>
      ))}
    </List>
  );
}

/**
 * Present minimum Participant administration data with textual state.
 *
 * @param {object} props Participant card properties.
 * @returns {import("react").ReactElement} One Participant card.
 */
function ParticipantCard({ participant, translate }) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Typography component="h2" variant="h2">
              {participant.name}
            </Typography>
            <ParticipantStateChip
              participant={participant}
              translate={translate}
            />
          </Stack>
          <Typography>{participant.email}</Typography>
          <Button
            component={RouterLink}
            sx={{ alignSelf: "flex-start" }}
            to={`/admin/participants/${participant.id}`}
            variant="outlined"
          >
            {translate("courseAccess.profile.adminNavigation")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Present global Participant state with text and supporting color.
 *
 * @param {object} props Participant state properties.
 * @returns {import("react").ReactElement} Participant state chip.
 */
function ParticipantStateChip({ participant, translate }) {
  const isActive = participant.state === "active";

  return (
    <Chip
      color={isActive ? "success" : "default"}
      label={translate(`courseAccess.participantState.${participant.state}`)}
      variant={isActive ? "filled" : "outlined"}
    />
  );
}

/**
 * Map one Course-access failure to localized administration presentation.
 *
 * @param {Error} error Language-neutral request failure.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized error copy.
 */
function courseAccessErrorMessage(error, translate) {
  const unavailableOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
  ]);

  return unavailableOutcomes.has(error?.outcome)
    ? translate("courseAccess.status.unavailable")
    : translate("courseAccess.status.technicalError");
}
