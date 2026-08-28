import { Button, Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useOutletContext } from "react-router";

import { ParticipantProfileForm } from "./ParticipantProfileForm.jsx";
import { useUpdateOwnParticipantProfile } from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Current Participant profile route. */
export function ParticipantProfilePage() {
  const { participant } = useOutletContext();
  const mutation = useUpdateOwnParticipantProfile();
  const { t } = useTranslation();

  return (
    <Paper
      elevation={2}
      sx={{ maxWidth: "48rem", mx: "auto", p: { xs: 3, sm: 5 } }}
    >
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {t("courseAccess.profile.selfTitle")}
        </Typography>
        <Typography>{t("courseAccess.profile.selfDescription")}</Typography>
        <Button component={RouterLink} sx={{ alignSelf: "flex-start" }} to="/">
          {t("courseAccess.profile.toParticipantHome")}
        </Button>
        <ParticipantProfileForm
          mode="self"
          mutation={mutation}
          participant={participant}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}
