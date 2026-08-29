import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useOutletContext } from "react-router";

import { AdminSignOutButton } from "./AdminSignOutButton.jsx";

/**
 * Present the narrow current Active Admin context.
 *
 * @param {object} props Component properties.
 * @param {object} props.admin The current Admin representation.
 * @param {boolean} props.hasJustBootstrapped Whether bootstrap just succeeded.
 * @param {object} props.signOutMutation The Better Auth sign-out mutation.
 * @returns {import("react").ReactElement} The administration context.
 */
export function AdministrationContext({
  admin,
  hasJustBootstrapped,
  signOutMutation,
}) {
  const { t } = useTranslation();
  const successRef = useRef(null);

  useEffect(() => {
    if (hasJustBootstrapped) {
      successRef.current?.focus();
    }
  }, [hasJustBootstrapped]);

  return (
    <Stack
      aria-labelledby="administration-context-title"
      component="section"
      spacing={3}
      sx={{ overflowWrap: "anywhere" }}
    >
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
      <Typography component="h1" id="administration-context-title" variant="h1">
        {t("adminAccess.context.title")}
      </Typography>
      <AdministrationDetails admin={admin} translate={t} />
      <AdminSignOutButton signOutMutation={signOutMutation} />
      <AdministrationNavigation translate={t} />
    </Stack>
  );
}

/**
 * Present the focused administration destinations.
 *
 * @param {object} props Navigation properties.
 * @returns {import("react").ReactElement} Administration navigation actions.
 */
function AdministrationNavigation({ translate }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <Button
        component={RouterLink}
        to="/admin/courses"
        variant="contained"
      >
        {translate("adminAccess.context.courses")}
      </Button>
      <Button
        component={RouterLink}
        to="/admin/participants"
        variant="outlined"
      >
        {translate("courseAccess.navigation.participants")}
      </Button>
      <Button
        component={RouterLink}
        to="/admin/users"
        variant="outlined"
      >
        {translate("adminUsers.navigation")}
      </Button>
      <Button
        component={RouterLink}
        to="/admin/invites"
        variant="outlined"
      >
        {translate("adminInvites.navigation")}
      </Button>
    </Stack>
  );
}

/**
 * Read the Active Admin gate context for the administration index route.
 *
 * @returns {import("react").ReactElement} The administration index content.
 */
export function AdministrationContextRoute() {
  const context = useOutletContext();

  return <AdministrationContext {...context} />;
}

/**
 * Present the current Admin's booking-system identity and authority.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The semantic detail list.
 */
function AdministrationDetails({ admin, translate }) {
  const authority =
    admin.authority === "super-admin"
      ? translate("adminAccess.context.superAdmin")
      : translate("adminAccess.context.admin");

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
        {translate("adminAccess.context.name")}
      </Typography>
      <Typography component="dd" sx={{ m: 0 }}>
        {admin.name}
      </Typography>
      <Typography component="dt" fontWeight={700}>
        {translate("adminAccess.context.state")}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        <Chip color="success" label={translate("adminAccess.context.active")} />
      </Box>
      <Typography component="dt" fontWeight={700}>
        {translate("adminAccess.context.authority")}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        <Chip color="primary" label={authority} variant="outlined" />
      </Box>
    </Box>
  );
}
