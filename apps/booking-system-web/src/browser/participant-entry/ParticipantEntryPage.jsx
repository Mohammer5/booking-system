import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { ParticipantGoogleSignInButton } from "./ParticipantGoogleSignInButton.jsx";
import { ParticipantRegistrationForm } from "./ParticipantRegistrationForm.jsx";
import { ParticipantSignOutButton } from "./ParticipantSignOutButton.jsx";
import { useParticipantEntry } from "./useParticipantEntry.js";

/**
 * Compose the independently navigable Participant entry and onboarding flow.
 *
 * @returns {import("react").ReactElement} Current Participant route state.
 */
export function ParticipantEntryPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const participantFlow = useParticipantEntry();
  const isAuthenticationFailure =
    searchParams.get("authentication") === "failed";

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          maxWidth: "48rem",
          mx: "auto",
          overflowWrap: "anywhere",
          p: { xs: 3, sm: 5 },
        }}
      >
        <ParticipantEntryContent
          isAuthenticationFailure={isAuthenticationFailure}
          participantFlow={participantFlow}
          translate={t}
        />
      </Paper>
      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        autoHideDuration={6000}
        onClose={() => participantFlow.signOutMutation.reset()}
        open={participantFlow.signOutMutation.isSuccess}
      >
        <Alert role="status" severity="success">
          {t("participantEntry.authentication.signOutSuccess")}
        </Alert>
      </Snackbar>
    </>
  );
}

/**
 * Select one Participant presentation from authoritative query state.
 *
 * @param {object} props Participant flow presentation state.
 * @returns {import("react").ReactElement} Current entry content.
 */
function ParticipantEntryContent({
  isAuthenticationFailure,
  participantFlow,
  translate,
}) {
  if (participantFlow.currentParticipantQuery.isPending) {
    return <ParticipantLoading translate={translate} />;
  }

  if (participantFlow.currentParticipantQuery.isSuccess) {
    return (
      <ParticipantHome
        participantFlow={participantFlow}
        translate={translate}
      />
    );
  }

  const outcome = participantFlow.currentParticipantQuery.error.outcome;

  if (outcome === "unauthenticated") {
    return (
      <ParticipantAuthenticationEntry
        focusOnSignIn={participantFlow.signOutMutation.isSuccess}
        isAuthenticationFailure={isAuthenticationFailure}
        signInMutation={participantFlow.signInMutation}
        translate={translate}
      />
    );
  }

  if (outcome === "no-participant") {
    return (
      <ParticipantOnboarding
        participantFlow={participantFlow}
        translate={translate}
      />
    );
  }

  if (outcome === "disabled-participant") {
    return (
      <ParticipantUnavailable
        participantFlow={participantFlow}
        translate={translate}
      />
    );
  }

  return <ParticipantTechnicalError translate={translate} />;
}

/**
 * Present the pending current-context state.
 *
 * @param {object} props Translation property.
 * @returns {import("react").ReactElement} Loading state.
 */
function ParticipantLoading({ translate }) {
  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("participantEntry.title")}
      </Typography>
      <Stack
        aria-live="polite"
        role="status"
        spacing={2}
        sx={{ alignItems: "center" }}
      >
        <CircularProgress aria-hidden="true" size={36} />
        <Typography>{translate("participantEntry.status.loading")}</Typography>
      </Stack>
    </Stack>
  );
}

/**
 * Present normal Participant Google entry.
 *
 * @param {object} props Authentication presentation state.
 * @returns {import("react").ReactElement} Unauthenticated entry.
 */
function ParticipantAuthenticationEntry(props) {
  const authenticationFailureRef = useRef(null);

  useEffect(() => {
    if (props.isAuthenticationFailure) {
      authenticationFailureRef.current?.focus();
    }
  }, [props.isAuthenticationFailure]);

  return (
    <Stack component="section" spacing={3}>
      {props.isAuthenticationFailure ? (
        <Alert
          ref={authenticationFailureRef}
          severity="error"
          tabIndex={-1}
        >
          {props.translate("participantEntry.authentication.failure")}
        </Alert>
      ) : null}
      <Typography component="h1" variant="h1">
        {props.translate("participantEntry.title")}
      </Typography>
      <Typography>
        {props.translate("participantEntry.authentication.description")}
      </Typography>
      <ParticipantGoogleSignInButton
        focusOnRender={props.focusOnSignIn}
        signInMutation={props.signInMutation}
      />
    </Stack>
  );
}

/**
 * Present mandatory explicit Participant profile onboarding.
 *
 * @param {object} props Participant flow state.
 * @returns {import("react").ReactElement} Onboarding state.
 */
function ParticipantOnboarding({ participantFlow, translate }) {
  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("participantEntry.onboarding.title")}
      </Typography>
      <Typography>
        {translate("participantEntry.onboarding.description")}
      </Typography>
      <ParticipantRegistrationForm
        registrationMutation={participantFlow.registrationMutation}
      />
      <ParticipantSignOutButton
        signOutMutation={participantFlow.signOutMutation}
      />
    </Stack>
  );
}

/**
 * Present the registered Participant and truthful zero-membership state.
 *
 * @param {object} props Active Participant flow state.
 * @returns {import("react").ReactElement} Participant home.
 */
function ParticipantHome({ participantFlow, translate }) {
  const successRef = useRef(null);

  useEffect(() => {
    if (participantFlow.registrationMutation.isSuccess) {
      successRef.current?.focus();
    }
  }, [participantFlow.registrationMutation.isSuccess]);

  const participant = participantFlow.currentParticipantQuery.data;

  return (
    <Stack component="section" spacing={3}>
      {participantFlow.registrationMutation.isSuccess ? (
        <Alert ref={successRef} role="status" severity="success" tabIndex={-1}>
          {translate("participantEntry.onboarding.success")}
        </Alert>
      ) : null}
      <Typography component="h1" variant="h1">
        {translate("participantEntry.home.title")}
      </Typography>
      <ParticipantDetails participant={participant} translate={translate} />
      <Alert role="status" severity="info">
        <AlertTitle>{translate("participantEntry.home.emptyTitle")}</AlertTitle>
        {translate("participantEntry.home.emptyDescription")}
      </Alert>
      <ParticipantSignOutButton
        signOutMutation={participantFlow.signOutMutation}
      />
    </Stack>
  );
}

/**
 * Present the current Participant profile without implying Course access.
 *
 * @param {object} props Participant details.
 * @returns {import("react").ReactElement} Semantic profile description list.
 */
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

/**
 * Present Disabled Participant refusal with the safe sign-out action.
 *
 * @param {object} props Participant flow state.
 * @returns {import("react").ReactElement} Unavailable state.
 */
function ParticipantUnavailable({ participantFlow, translate }) {
  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("participantEntry.title")}
      </Typography>
      <Alert severity="warning">
        {translate("participantEntry.status.disabled")}
      </Alert>
      <ParticipantSignOutButton
        signOutMutation={participantFlow.signOutMutation}
      />
    </Stack>
  );
}

/**
 * Present an unexpected current-context failure without leaking details.
 *
 * @param {object} props Translation property.
 * @returns {import("react").ReactElement} Technical error state.
 */
function ParticipantTechnicalError({ translate }) {
  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("participantEntry.title")}
      </Typography>
      <Alert severity="error">
        {translate("participantEntry.status.technicalError")}
      </Alert>
    </Stack>
  );
}
