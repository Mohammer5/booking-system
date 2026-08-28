import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";

import { ParticipantCourseList } from "../course-access/index.js";
import { ParticipantSignOutButton } from "./ParticipantSignOutButton.jsx";

/**
 * Present current Participant profile, assigned Courses, and sign-out.
 *
 * @returns {import("react").ReactElement} Participant home route.
 */
export function ParticipantHomePage() {
  const { participant, hasJustRegistered, signOutMutation } = useOutletContext();
  const { t } = useTranslation();
  const successRef = useRef(null);

  useEffect(() => {
    if (hasJustRegistered) {
      successRef.current?.focus();
    }
  }, [hasJustRegistered]);

  return (
    <Stack component="section" spacing={3}>
      {hasJustRegistered ? (
        <Alert ref={successRef} role="status" severity="success" tabIndex={-1}>
          {t("participantEntry.onboarding.success")}
        </Alert>
      ) : null}
      <Typography component="h1" variant="h1">
        {t("participantEntry.home.title")}
      </Typography>
      <ParticipantDetails participant={participant} translate={t} />
      <ParticipantCourseList />
      <ParticipantSignOutButton signOutMutation={signOutMutation} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Semantic Participant profile details. */
function ParticipantDetails({ participant, translate }) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: { xs: "1fr", sm: "minmax(8rem, 1fr) 2fr" },
        m: 0,
      }}
    >
      <Typography component="dt" fontWeight={700}>
        {translate("participantEntry.home.name")}
      </Typography>
      <Typography component="dd" sx={{ m: 0 }}>
        {participant.name}
      </Typography>
      <Typography component="dt" fontWeight={700}>
        {translate("participantEntry.home.email")}
      </Typography>
      <Typography component="dd" sx={{ m: 0 }}>
        {participant.email}
      </Typography>
      <Typography component="dt" fontWeight={700}>
        {translate("participantEntry.home.state")}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        <Chip
          color="success"
          label={translate("participantEntry.home.active")}
        />
      </Box>
    </Box>
  );
}
