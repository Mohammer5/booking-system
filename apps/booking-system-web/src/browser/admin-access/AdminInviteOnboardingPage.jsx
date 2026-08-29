import {
  Alert,
  CircularProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { AdminSignOutButton } from "../admin-bootstrap/AdminSignOutButton.jsx";
import { GoogleSignInButton } from "../admin-bootstrap/GoogleSignInButton.jsx";
import { AdminInviteOnboardingForm } from "./AdminInviteOnboardingForm.jsx";
import {
  captureAdminInviteToken,
  useAdminInviteOnboarding,
} from "./useAdminInviteOnboarding.js";

/** @returns {import("react").ReactElement} Public invited Admin onboarding route. */
export function AdminInviteOnboardingPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(captureAdminInviteToken);
  const flow = useAdminInviteOnboarding(token);
  const recognition = flow.recognitionQuery;
  const refetchRecognition = recognition.refetch;

  useEffect(() => {
    const captureChangedFragment = () => {
      const changedToken = captureAdminInviteToken();

      flow.claimMutation.reset();
      if (changedToken === token) {
        refetchRecognition();
      } else {
        setToken(changedToken);
      }
    };

    globalThis.addEventListener("hashchange", captureChangedFragment);
    return () => globalThis.removeEventListener(
      "hashchange",
      captureChangedFragment,
    );
  }, [flow.claimMutation, refetchRecognition, token]);

  useEffect(() => {
    const isDefinitive = recognition.isSuccess ||
      recognition.error?.status === 404;

    if (token !== null && isDefinitive) setToken(null);
  }, [recognition.error?.status, recognition.isSuccess, token]);

  return (
    <Paper
      component="section"
      elevation={2}
      sx={{
        maxWidth: "42rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {t("adminInviteOnboarding.title")}
        </Typography>
        <Typography>{t("adminInviteOnboarding.description")}</Typography>
        <AdminInvitePublicState
          flow={flow}
          isAuthenticationFailure={
            searchParams.get("authentication") === "failed"
          }
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Current public recognition state. */
function AdminInvitePublicState(props) {
  const query = props.flow.recognitionQuery;

  if (query.isPending) {
    return <LoadingState message={props.translate("adminInviteOnboarding.loading")} />;
  }

  if (query.error?.status === 404) {
    return (
      <FocusedAlert severity="warning">
        {props.translate("adminInviteOnboarding.unavailable")}
      </FocusedAlert>
    );
  }

  if (query.isError) {
    return (
      <FocusedAlert severity="error">
        {props.translate("adminInviteOnboarding.technicalError")}
      </FocusedAlert>
    );
  }

  return <AvailableAdminInvite {...props} />;
}

/** @returns {import("react").ReactElement} Authenticated onboarding state. */
function AvailableAdminInvite(props) {
  const { claimMutation, currentAdminQuery } = props.flow;

  if (claimMutation.isSuccess) {
    return (
      <Stack spacing={2}>
        <FocusedAlert role="status" severity="success">
          {props.translate("adminInviteOnboarding.success")}
        </FocusedAlert>
        <MuiLink component={Link} to="/admin" variant="button">
          {props.translate("adminInviteOnboarding.toAdministration")}
        </MuiLink>
      </Stack>
    );
  }

  if (currentAdminQuery.isPending) {
    return <LoadingState message={props.translate("adminInviteOnboarding.contextLoading")} />;
  }

  return <ResolvedAdminContext {...props} />;
}

/** @returns {import("react").ReactElement} Current principal onboarding state. */
function ResolvedAdminContext(props) {
  const { currentAdminQuery } = props.flow;

  if (currentAdminQuery.error?.outcome === "unauthenticated") {
    return (
      <Stack spacing={2}>
        {props.isAuthenticationFailure ? (
          <FocusedAlert severity="error">
            {props.translate("adminInviteOnboarding.authentication.failed")}
          </FocusedAlert>
        ) : null}
        <Typography>
          {props.translate("adminInviteOnboarding.authentication.description")}
        </Typography>
        <GoogleSignInButton
          focusOnRender={props.flow.signOutMutation.isSuccess}
          signInMutation={props.flow.signInMutation}
        />
      </Stack>
    );
  }

  if (currentAdminQuery.error?.outcome === "no-admin-user") {
    return (
      <Stack spacing={3}>
        <Typography component="h2" variant="h2">
          {props.translate("adminInviteOnboarding.name.title")}
        </Typography>
        <Typography>{props.translate("adminInviteOnboarding.name.description")}</Typography>
        <AdminInviteOnboardingForm
          mutation={props.flow.claimMutation}
          translate={props.translate}
        />
        <AdminSignOutButton signOutMutation={props.flow.signOutMutation} />
      </Stack>
    );
  }

  if (
    currentAdminQuery.isSuccess ||
    currentAdminQuery.error?.outcome === "disabled-admin"
  ) {
    return (
      <Stack spacing={2}>
        <FocusedAlert severity="warning">
          {props.translate("adminInviteOnboarding.existing")}
        </FocusedAlert>
        <AdminSignOutButton signOutMutation={props.flow.signOutMutation} />
      </Stack>
    );
  }

  return (
    <FocusedAlert severity="error">
      {props.translate("adminInviteOnboarding.technicalError")}
    </FocusedAlert>
  );
}

/** @returns {import("react").ReactElement} Pending status. */
function LoadingState({ message }) {
  return (
    <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress aria-hidden="true" size={32} />
      <Typography>{message}</Typography>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Alert focused after state change. */
function FocusedAlert(props) {
  const alertRef = useRef(null);

  useEffect(() => {
    alertRef.current?.focus();
  }, []);

  return <Alert {...props} ref={alertRef} tabIndex={-1} />;
}
