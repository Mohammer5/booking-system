import {
  Alert,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { AdminRegistrationForm } from "./AdminRegistrationForm.jsx";
import { AdminSignOutButton } from "./AdminSignOutButton.jsx";
import { AdministrationContext } from "./AdministrationContext.jsx";
import { GoogleSignInButton } from "./GoogleSignInButton.jsx";
import { useAdminBootstrap } from "./useAdminBootstrap.js";

/**
 * Compose the independently navigable first-Admin browser flow.
 *
 * @returns {import("react").ReactElement} The Admin route content.
 */
export function AdminBootstrapPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const adminFlow = useAdminBootstrap();
  const isAuthenticationFailure =
    searchParams.get("authentication") === "failed";
  const authenticationFailureRef = useRef(null);
  const isLoading =
    adminFlow.entryQuery.isPending || adminFlow.currentAdminQuery.isPending;

  useEffect(() => {
    if (isAuthenticationFailure && !isLoading) {
      authenticationFailureRef.current?.focus();
    }
  }, [isAuthenticationFailure, isLoading]);

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        alignItems: "center",
        display: "grid",
        minHeight: "100vh",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 6 },
      }}
    >
      <Paper
        elevation={3}
        sx={{ overflowWrap: "anywhere", p: { xs: 3, sm: 5 }, width: "100%" }}
      >
        <Stack spacing={3}>
          {isAuthenticationFailure && !isLoading ? (
            <Alert
              ref={authenticationFailureRef}
              severity="error"
              tabIndex={-1}
            >
              {t("adminAccess.authentication.failure")}
            </Alert>
          ) : null}
          <AdminBootstrapContent
            adminFlow={adminFlow}
            isLoading={isLoading}
            translate={t}
          />
        </Stack>
      </Paper>
    </Container>
  );
}

/**
 * Select the current presentation without changing the remote state machine.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The current route state.
 */
function AdminBootstrapContent({ adminFlow, isLoading, translate }) {
  if (isLoading) {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.login.title")}
        </Typography>
        <Stack
          aria-live="polite"
          role="status"
          spacing={2}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress aria-hidden="true" size={36} />
          <Typography>{translate("adminAccess.status.loading")}</Typography>
        </Stack>
      </Stack>
    );
  }

  if (
    adminFlow.entryQuery.isError ||
    isTechnicalCurrentAdminError(adminFlow.currentAdminQuery)
  ) {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.login.title")}
        </Typography>
        <Alert severity="error">
          {translate("adminAccess.status.technicalError")}
        </Alert>
      </Stack>
    );
  }

  if (adminFlow.entryQuery.data.mode === "register-admin") {
    return <FirstAdminEntry adminFlow={adminFlow} translate={translate} />;
  }

  return <CurrentAdministration adminFlow={adminFlow} translate={translate} />;
}

/**
 * Present first-Admin authentication before the booking-system name form.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The current-context state.
 */
function FirstAdminEntry({ adminFlow, translate }) {
  if (adminFlow.currentAdminQuery.isSuccess) {
    return <ActiveAdministration adminFlow={adminFlow} />;
  }

  if (adminFlow.currentAdminQuery.error.outcome === "unauthenticated") {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.bootstrap.title")}
        </Typography>
        <Typography>
          {translate("adminAccess.bootstrap.authenticationDescription")}
        </Typography>
        <GoogleSignInButton signInMutation={adminFlow.signInMutation} />
      </Stack>
    );
  }

  if (adminFlow.currentAdminQuery.error.outcome === "no-admin-user") {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.bootstrap.title")}
        </Typography>
        <Typography>
          {translate("adminAccess.bootstrap.nameDescription")}
        </Typography>
        <AdminRegistrationForm
          bootstrapMutation={adminFlow.bootstrapMutation}
        />
        <AdminSignOutButton signOutMutation={adminFlow.signOutMutation} />
      </Stack>
    );
  }

  return <RefusedAdministration adminFlow={adminFlow} translate={translate} />;
}

/**
 * Present current Admin query state after bootstrap has been consumed.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The current-context state.
 */
function CurrentAdministration({ adminFlow, translate }) {
  if (adminFlow.currentAdminQuery.isSuccess) {
    return <ActiveAdministration adminFlow={adminFlow} />;
  }

  if (adminFlow.currentAdminQuery.error.outcome === "unauthenticated") {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.login.title")}
        </Typography>
        <Typography>
          {translate("adminAccess.login.authenticationRequired")}
        </Typography>
        <GoogleSignInButton signInMutation={adminFlow.signInMutation} />
      </Stack>
    );
  }

  return <RefusedAdministration adminFlow={adminFlow} translate={translate} />;
}

/**
 * Present an authenticated Active Admin and session recovery action.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The Active administration state.
 */
function ActiveAdministration({ adminFlow }) {
  return (
    <AdministrationContext
      admin={adminFlow.currentAdminQuery.data}
      hasJustBootstrapped={adminFlow.bootstrapMutation.isSuccess}
      signOutMutation={adminFlow.signOutMutation}
    />
  );
}

/**
 * Present an authenticated but unauthorized Admin context with sign-out.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The refused administration state.
 */
function RefusedAdministration({ adminFlow, translate }) {
  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {translate("adminAccess.login.title")}
      </Typography>
      <Alert severity="warning">
        {currentAdminErrorMessage(adminFlow.currentAdminQuery.error, translate)}
      </Alert>
      <AdminSignOutButton signOutMutation={adminFlow.signOutMutation} />
    </Stack>
  );
}

/**
 * Distinguish expected language-neutral Admin refusals from technical errors.
 *
 * @param {object} currentAdminQuery The authoritative current-Admin query.
 * @returns {boolean} Whether the query failed for a technical reason.
 */
function isTechnicalCurrentAdminError(currentAdminQuery) {
  const expectedOutcomes = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
  ]);

  return (
    currentAdminQuery.isError &&
    !expectedOutcomes.has(currentAdminQuery.error.outcome)
  );
}

/**
 * Map current-Admin outcomes to German presentation.
 *
 * @param {Error} error The language-neutral remote failure.
 * @param {(key: string) => string} translate The translation function.
 * @returns {string} The localized state message.
 */
function currentAdminErrorMessage(error, translate) {
  const keysByOutcome = {
    unauthenticated: "adminAccess.login.authenticationRequired",
    "no-admin-user": "adminAccess.login.noAdminUser",
    "disabled-admin": "adminAccess.login.disabledAdmin",
  };
  const key = keysByOutcome[error.outcome];

  return translate(key ?? "adminAccess.status.technicalError");
}
