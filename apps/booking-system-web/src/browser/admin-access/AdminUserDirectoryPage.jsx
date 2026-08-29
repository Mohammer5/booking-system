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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import { useAdminUsers } from "./useAdminUsers.js";
import { AdminUserPromotionControl } from "./AdminUserPromotionControl.jsx";

/** @returns {import("react").ReactElement} Current Admin User directory route. */
export function AdminUserDirectoryPage() {
  const { t: translate } = useTranslation();
  const query = useAdminUsers();
  const errorRef = useRef(null);

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

  return (
    <Paper elevation={2} sx={{ mx: "auto", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3} sx={{ overflowWrap: "anywhere" }}>
        <Typography component="h1" variant="h1">
          {translate("adminUsers.directory.title")}
        </Typography>
        <Typography>{translate("adminUsers.directory.description")}</Typography>
        <Button component={RouterLink} sx={{ alignSelf: "flex-start" }} to="/admin">
          {translate("adminUsers.toAdministration")}
        </Button>
        <AdminUserDirectoryState
          errorRef={errorRef}
          query={query}
          translate={translate}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Current directory state. */
function AdminUserDirectoryState({ errorRef, query, translate }) {
  if (query.isPending) {
    return (
      <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={36} />
        <Typography>{translate("adminUsers.status.loading")}</Typography>
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {adminUserErrorMessage(query.error, translate)}
      </Alert>
    );
  }

  if (query.data.adminUsers.length === 0) {
    return <Alert severity="info">{translate("adminUsers.status.empty")}</Alert>;
  }

  return <AdminUserDirectory adminUsers={query.data.adminUsers} translate={translate} />;
}

/** @returns {import("react").ReactElement} Responsive table and card alternatives. */
function AdminUserDirectory({ adminUsers, translate }) {
  return (
    <>
      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table aria-label={translate("adminUsers.directory.tableLabel")}>
          <TableHead>
            <TableRow>
              <TableCell>{translate("adminUsers.fields.name")}</TableCell>
              <TableCell>{translate("adminUsers.fields.authority")}</TableCell>
              <TableCell>{translate("adminUsers.fields.state")}</TableCell>
              <TableCell>{translate("adminUsers.directory.actionColumn")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {adminUsers.map((adminUser) => (
              <AdminUserTableRow
                adminUser={adminUser}
                key={adminUser.id}
                translate={translate}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <List
        aria-label={translate("adminUsers.directory.listLabel")}
        disablePadding
        sx={{ display: { xs: "block", md: "none" } }}
      >
        {adminUsers.map((adminUser) => (
          <ListItem disablePadding key={adminUser.id} sx={{ mb: 2 }}>
            <AdminUserCard adminUser={adminUser} translate={translate} />
          </ListItem>
        ))}
      </List>
    </>
  );
}

/** @returns {import("react").ReactElement} One desktop Admin User row. */
function AdminUserTableRow({ adminUser, translate }) {
  return (
    <TableRow>
      <TableCell component="th" scope="row">{adminUser.name}</TableCell>
      <TableCell><AdminAuthorityChip adminUser={adminUser} translate={translate} /></TableCell>
      <TableCell><AdminStateChip adminUser={adminUser} translate={translate} /></TableCell>
      <TableCell>
        <Stack spacing={1.5}>
          <AdminUserDetailLink adminUser={adminUser} translate={translate} />
          <AdminUserPromotionControl
            adminUser={adminUser}
            translate={translate}
          />
        </Stack>
      </TableCell>
    </TableRow>
  );
}

/** @returns {import("react").ReactElement} One narrow Admin User card. */
function AdminUserCard({ adminUser, translate }) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography component="h2" variant="h2">{adminUser.name}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <AdminAuthorityChip adminUser={adminUser} translate={translate} />
            <AdminStateChip adminUser={adminUser} translate={translate} />
          </Stack>
          <AdminUserDetailLink adminUser={adminUser} translate={translate} />
          <AdminUserPromotionControl
            adminUser={adminUser}
            translate={translate}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {import("react").ReactElement} Stable detail navigation. */
function AdminUserDetailLink({ adminUser, translate }) {
  return (
    <Button
      component={RouterLink}
      sx={{ alignSelf: "flex-start" }}
      to={`/admin/users/${adminUser.id}`}
      variant={adminUser.isNameEditable ? "outlined" : "text"}
    >
      {translate(adminUser.isNameEditable
        ? "adminUsers.directory.editAction"
        : "adminUsers.directory.detailAction")}
    </Button>
  );
}

/** @returns {import("react").ReactElement} Explicit authority label. */
export function AdminAuthorityChip({ adminUser, translate }) {
  return (
    <Chip
      color={adminUser.authority === "super-admin" ? "primary" : "default"}
      label={translate(`adminUsers.authority.${adminUser.authority}`)}
      variant="outlined"
    />
  );
}

/** @returns {import("react").ReactElement} Explicit lifecycle state label. */
export function AdminStateChip({ adminUser, translate }) {
  const isActive = adminUser.state === "active";

  return (
    <Chip
      color={isActive ? "success" : "default"}
      label={translate(`adminUsers.state.${adminUser.state}`)}
      variant={isActive ? "filled" : "outlined"}
    />
  );
}

/** @returns {string} Localized directory failure. */
function adminUserErrorMessage(error, translate) {
  const unavailable = new Set([
    "admin-not-active",
    "disabled-admin",
    "no-admin-user",
    "unauthenticated",
  ]);

  return translate(unavailable.has(error?.outcome)
    ? "adminUsers.status.unavailable"
    : "adminUsers.status.technicalError");
}
