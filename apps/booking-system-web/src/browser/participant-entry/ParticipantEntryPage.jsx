import {
  Alert,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useSearchParams } from "react-router";

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
      {participantFlow.currentParticipantQuery.isSuccess ? (
        <ActiveParticipantOutlet participantFlow={participantFlow} />
      ) : (
        <ParticipantEntrySurface
          isAuthenticationFailure={isAuthenticationFailure}
          participantFlow={participantFlow}
          translate={t}
        />
      )}
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

/** @returns {import("react").ReactElement} Bounded Participant entry surface. */
function ParticipantEntrySurface(props) {
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
      <ParticipantEntryContent {...props} />
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Authorized nested Participant route. */
function ActiveParticipantOutlet({ participantFlow }) {
  return (
    <Outlet
      context={{
        participant: participantFlow.currentParticipantQuery.data,
        hasJustRegistered: participantFlow.registrationMutation.isSuccess,
        signOutMutation: participantFlow.signOutMutation,
      }}
    />
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
 * Present Disabled Participant refusal with the safe sign-out action.
 *
 * @param {object} props Participant flow state.
 * @returns {import("react").ReactElement} Unavailable state.
 */
function ParticipantUnavailable({ participantFlow, translate }) {
  const unavailableRef = useRef(null);

  useEffect(() => {
    unavailableRef.current?.focus();
  }, []);

  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("participantEntry.title")}
      </Typography>
      <Alert ref={unavailableRef} severity="warning" tabIndex={-1}>
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
