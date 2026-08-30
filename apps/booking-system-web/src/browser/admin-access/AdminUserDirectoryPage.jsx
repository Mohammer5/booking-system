import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
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
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";

import {
  AdminCollectionResults,
  AdminCollectionSortLabel,
  AdminCollectionToolbar,
  createAdminCollectionConfiguration,
  useAdminCollectionState,
} from "../admin-collections/index.js";
import { useAdminUsers } from "./useAdminUsers.js";

const adminUserCollection = createAdminCollectionConfiguration({
  searchable: true,
  filters: {
    state: ["active", "disabled"],
    authority: ["admin", "super-admin"],
  },
  sortFields: ["name", "state", "authority"],
  defaultSort: "name.asc",
});

/** @returns {import("react").ReactElement} Current Admin User collection route. */
export function AdminUserDirectoryPage() {
  const model = useAdminUserDirectoryModel();
  const adminUsers = model.query.data?.adminUsers ?? [];

  return (
    <Paper elevation={2} sx={{ mx: "auto", overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <Stack spacing={1}>
          <Typography component="h1" variant="h1">
            {model.translate("adminUsers.directory.title")}
          </Typography>
          <Typography>{model.translate("adminUsers.directory.description")}</Typography>
        </Stack>
        <LifecycleSuccess model={model} />
        <AdminCollectionToolbar
          filters={adminUserFilters(model.translate)}
          hasFilters={model.collection.hasFilters}
          labels={collectionLabels(model.translate)}
          onFilter={model.collection.setFilter}
          onReset={model.collection.resetFilters}
          onSearch={model.collection.setSearch}
          onSort={model.collection.setSort}
          searchLabel={model.translate("adminUsers.directory.search")}
          sorts={adminUserSorts(model.translate)}
          state={model.collection.state}
        />
        <AdminCollectionResults
          errorMessage={(error) => adminUserErrorMessage(error, model.translate)}
          hasFilters={model.collection.hasFilters}
          items={adminUsers}
          messages={resultMessages(model.translate)}
          onPage={model.collection.setPage}
          onPageSize={model.collection.setPageSize}
          onReset={model.collection.resetFilters}
          query={model.query}
          renderDesktop={() => (
            <AdminUserTable
              adminUsers={adminUsers}
              collection={model.collection}
              translate={model.translate}
            />
          )}
          renderMobile={() => (
            <AdminUserCards adminUsers={adminUsers} translate={model.translate} />
          )}
          state={model.collection.state}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {object} URL/query state and returned deletion feedback. */
function useAdminUserDirectoryModel() {
  const { t: translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const collection = useAdminCollectionState(adminUserCollection);
  const query = useAdminUsers(collection.state);
  const successRef = useRef(null);
  const [lifecycleSuccess] = useState(
    location.state?.adminUserLifecycleSuccess ?? null,
  );

  useEffect(() => {
    if (lifecycleSuccess !== null) successRef.current?.focus();
  }, [lifecycleSuccess]);
  useEffect(() => {
    if (location.state?.adminUserLifecycleSuccess === undefined) return;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  return { collection, lifecycleSuccess, query, successRef, translate };
}

/** @returns {import("react").ReactElement | null} Returned detail success. */
function LifecycleSuccess({ model }) {
  return model.lifecycleSuccess === null ? null : (
    <Alert ref={model.successRef} role="status" severity="success" tabIndex={-1}>
      {model.translate(
        `adminUsers.lifecycle.success.${model.lifecycleSuccess.action}`,
        { name: model.lifecycleSuccess.name },
      )}
    </Alert>
  );
}

/** @returns {import("react").ReactElement} Wide semantic Admin User table. */
function AdminUserTable({ adminUsers, collection, translate }) {
  const heading = (field) => (
    <AdminCollectionSortLabel
      field={field}
      onSort={collection.toggleSort}
      state={collection.state}
    >
      {translate(`adminUsers.fields.${field}`)}
    </AdminCollectionSortLabel>
  );

  return (
    <TableContainer>
      <Table aria-label={translate("adminUsers.directory.tableLabel")}>
        <TableHead>
          <TableRow>
            <TableCell sortDirection={sortDirection(collection, "name")}>{heading("name")}</TableCell>
            <TableCell sortDirection={sortDirection(collection, "authority")}>{heading("authority")}</TableCell>
            <TableCell sortDirection={sortDirection(collection, "state")}>{heading("state")}</TableCell>
            <TableCell>{translate("adminUsers.directory.actionColumn")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {adminUsers.map((adminUser) => (
            <TableRow key={adminUser.id}>
              <TableCell component="th" scope="row">{adminUser.name}</TableCell>
              <TableCell><AdminAuthorityChip adminUser={adminUser} translate={translate} /></TableCell>
              <TableCell><AdminStateChip adminUser={adminUser} translate={translate} /></TableCell>
              <TableCell><AdminUserDetailLink adminUser={adminUser} translate={translate} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow Admin User card list. */
function AdminUserCards({ adminUsers, translate }) {
  return (
    <List aria-label={translate("adminUsers.directory.listLabel")} disablePadding>
      {adminUsers.map((adminUser) => (
        <ListItem disablePadding key={adminUser.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h2">{adminUser.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  <AdminAuthorityChip adminUser={adminUser} translate={translate} />
                  <AdminStateChip adminUser={adminUser} translate={translate} />
                </Stack>
                <AdminUserDetailLink adminUser={adminUser} translate={translate} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} Stable detail navigation only. */
function AdminUserDetailLink({ adminUser, translate }) {
  return (
    <Button
      component={RouterLink}
      to={`/admin/users/${adminUser.id}`}
      variant="outlined"
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

/** @returns {Array<object>} Localized Admin User filters. */
function adminUserFilters(translate) {
  return [
    {
      name: "state",
      label: translate("adminUsers.directory.filters.state"),
      options: [
        { value: "", label: translate("adminCollections.all") },
        { value: "active", label: translate("adminUsers.state.active") },
        { value: "disabled", label: translate("adminUsers.state.disabled") },
      ],
    },
    {
      name: "authority",
      label: translate("adminUsers.directory.filters.authority"),
      options: [
        { value: "", label: translate("adminCollections.all") },
        { value: "admin", label: translate("adminUsers.authority.admin") },
        { value: "super-admin", label: translate("adminUsers.authority.super-admin") },
      ],
    },
  ];
}

/** @returns {Array<object>} Localized Admin User sort choices. */
function adminUserSorts(translate) {
  return ["name", "authority", "state"].map((field) => ({
    field,
    ascendingLabel: translate("adminCollections.ascending", {
      field: translate(`adminUsers.fields.${field}`),
    }),
    descendingLabel: translate("adminCollections.descending", {
      field: translate(`adminUsers.fields.${field}`),
    }),
  }));
}

/** @returns {object} Shared localized control labels. */
function collectionLabels(translate) {
  return {
    searchAction: translate("adminCollections.searchAction"),
    resetAction: translate("adminCollections.resetAction"),
    sortLabel: translate("adminCollections.sortLabel"),
  };
}

/** @returns {object} Localized Admin User result messages. */
function resultMessages(translate) {
  return {
    loading: translate("adminUsers.status.loading"),
    empty: translate("adminUsers.status.empty"),
    filteredEmpty: translate("adminCollections.filteredEmpty"),
    pageEmpty: translate("adminCollections.pageEmpty"),
    reset: translate("adminCollections.resetAction"),
    rowsPerPage: translate("adminCollections.pagination.rowsPerPage"),
    of: translate("adminCollections.pagination.of"),
    first: translate("adminCollections.pagination.first"),
    last: translate("adminCollections.pagination.last"),
    next: translate("adminCollections.pagination.next"),
    previous: translate("adminCollections.pagination.previous"),
  };
}

/** @returns {string} Localized Admin User collection failure. */
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

/** @returns {"asc" | "desc" | false} Accessible active sort direction. */
function sortDirection(collection, field) {
  return collection.state.sortField === field
    ? collection.state.sortDirection
    : false;
}
