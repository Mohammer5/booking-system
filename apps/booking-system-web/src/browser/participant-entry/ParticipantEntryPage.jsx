import {
  Alert,
  AlertTitle,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

/**
 * Present the request-free Participant context before onboarding exists.
 *
 * @returns {import("react").ReactElement} The Participant entry state.
 */
export function ParticipantEntryPage() {
  const { t } = useTranslation();

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: "48rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {t("participantEntry.title")}
        </Typography>
        <Typography>{t("participantEntry.description")}</Typography>
        <Alert role="status" severity="info">
          <AlertTitle>{t("participantEntry.emptyTitle")}</AlertTitle>
          {t("participantEntry.emptyDescription")}
        </Alert>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin"
          variant="outlined"
        >
          {t("participantEntry.toAdministration")}
        </Button>
      </Stack>
    </Paper>
  );
}
