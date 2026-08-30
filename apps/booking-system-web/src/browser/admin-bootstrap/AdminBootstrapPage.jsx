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

import { ResponsiveApplicationShell } from "../application-shell/index.js";
import { AdminApplicationNavigation } from "./AdminApplicationNavigation.jsx";
import { AdminRegistrationForm } from "./AdminRegistrationForm.jsx";
import { AdminSignOutButton } from "./AdminSignOutButton.jsx";
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
  const isActiveAdmin =
    !isLoading &&
    !adminFlow.entryQuery.isError &&
    adminFlow.currentAdminQuery.isSuccess;

  useEffect(() => {
    if (isAuthenticationFailure && !isLoading) {
      authenticationFailureRef.current?.focus();
    }
  }, [isAuthenticationFailure, isLoading]);

  const renderAuthenticatedNavigation = isActiveAdmin
    ? (onNavigate) => (
        <AdminApplicationNavigation
          admin={adminFlow.currentAdminQuery.data}
          onNavigate={onNavigate}
        />
      )
    : undefined;

  return (
    <ResponsiveApplicationShell
      context="admin"
      renderAuthenticatedNavigation={renderAuthenticatedNavigation}
    >
      {isActiveAdmin ? (
        <ActiveAdminOutlet adminFlow={adminFlow} />
      ) : (
        <AdminEntrySurface
          adminFlow={adminFlow}
          authenticationFailureRef={authenticationFailureRef}
          isAuthenticationFailure={isAuthenticationFailure}
          isLoading={isLoading}
          translate={t}
        />
      )}
      <SignOutNotification adminFlow={adminFlow} translate={t} />
    </ResponsiveApplicationShell>
  );
}

/**
 * Supply current Active Admin state only to authorized nested routes.
 *
 * @param {object} props Active Admin state.
 * @returns {import("react").ReactElement} The nested Admin route outlet.
 */
function ActiveAdminOutlet({ adminFlow }) {
  const { t } = useTranslation();
  const successRef = useRef(null);
  const hasJustBootstrapped = adminFlow.bootstrapMutation.isSuccess;

  useEffect(() => {
    if (hasJustBootstrapped) {
      successRef.current?.focus();
    }
  }, [hasJustBootstrapped]);

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <AdminSignOutButton signOutMutation={adminFlow.signOutMutation} />
      </Stack>
      {hasJustBootstrapped ? (
        <Alert
          ref={successRef}
          role="status"
          severity="success"
          tabIndex={-1}
        >
          {t("adminAccess.bootstrap.success")}
        </Alert>
      ) : null}
      <Outlet
        context={{
          admin: adminFlow.currentAdminQuery.data,
          hasJustBootstrapped,
          signOutMutation: adminFlow.signOutMutation,
        }}
      />
    </Stack>
  );
}

/**
 * Present all non-Active administration entry and refusal states.
 *
 * @param {object} props Admin entry presentation state.
 * @returns {import("react").ReactElement} The bounded Admin entry surface.
 */
function AdminEntrySurface(props) {
  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: "38rem",
        mx: "auto",
        overflowWrap: "anywhere",
        p: { xs: 3, sm: 5 },
        width: "100%",
      }}
    >
      <Stack spacing={3}>
        {props.isAuthenticationFailure && !props.isLoading ? (
          <Alert
            ref={props.authenticationFailureRef}
            severity="error"
            tabIndex={-1}
          >
            {props.translate("adminAccess.authentication.failure")}
          </Alert>
        ) : null}
        <AdminBootstrapContent
          adminFlow={props.adminFlow}
          isLoading={props.isLoading}
          translate={props.translate}
        />
      </Stack>
    </Paper>
  );
}

/**
 * Announce successful termination of the normal Admin session.
 *
 * @param {object} props Sign-out presentation state.
 * @returns {import("react").ReactElement} The sign-out notification.
 */
function SignOutNotification({ adminFlow, translate }) {
  return (
    <Snackbar
      anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
      autoHideDuration={6000}
      onClose={() => adminFlow.signOutMutation.reset()}
      open={adminFlow.signOutMutation.isSuccess}
    >
      <Alert role="status" severity="success" variant="filled">
        {translate("adminAccess.authentication.signOutSuccess")}
      </Alert>
    </Snackbar>
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
  if (adminFlow.currentAdminQuery.error.outcome === "unauthenticated") {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.bootstrap.title")}
        </Typography>
        <Typography>
          {translate("adminAccess.bootstrap.authenticationDescription")}
        </Typography>
        <GoogleSignInButton
          focusOnRender={adminFlow.signOutMutation.isSuccess}
          signInMutation={adminFlow.signInMutation}
        />
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
  if (adminFlow.currentAdminQuery.error.outcome === "unauthenticated") {
    return (
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {translate("adminAccess.login.title")}
        </Typography>
        <Typography>
          {translate("adminAccess.login.authenticationRequired")}
        </Typography>
        <GoogleSignInButton
          focusOnRender={adminFlow.signOutMutation.isSuccess}
          signInMutation={adminFlow.signInMutation}
        />
      </Stack>
    );
  }

  return <RefusedAdministration adminFlow={adminFlow} translate={translate} />;
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
