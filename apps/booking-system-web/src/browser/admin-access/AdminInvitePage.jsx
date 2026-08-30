import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
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

import {
  AdminCollectionResults,
  AdminCollectionSortLabel,
  AdminCollectionToolbar,
  createAdminCollectionConfiguration,
  useAdminCollectionState,
} from "../admin-collections/index.js";
import { AdminInviteCreationDialog } from "./AdminInviteCreationDialog.jsx";
import { AdminInviteRevocationDialog } from "./AdminInviteRevocationDialog.jsx";
import {
  collectionLabels,
  inviteFilters,
  inviteSorts,
  resultMessages,
} from "./adminInviteCollectionPresentation.js";
import {
  useAdminInvites,
  useCreateAdminInvite,
  useRevokeAdminInvite,
} from "./useAdminInvites.js";

const inviteCollection = createAdminCollectionConfiguration({
  searchable: false,
  filters: { state: ["active", "claimed", "revoked"] },
  sortFields: ["createdAt", "state"],
  defaultSort: "createdAt.desc",
});

/** @returns {import("react").ReactElement} Stable Admin Invite collection view. */
export function AdminInvitePage() {
  const model = useAdminInvitePageModel();
  const invites = model.query.data?.invites ?? [];

  return (
    <Stack component="section" spacing={3}>
      <Stack spacing={1}>
        <Typography component="h1" variant="h1">
          {model.translate("adminInvites.title")}
        </Typography>
        <Typography>{model.translate("adminInvites.description")}</Typography>
      </Stack>
      <Button
        disabled={model.createMutation.isPending}
        onClick={model.createInvite}
        sx={{ alignSelf: "flex-start" }}
        variant="contained"
      >
        {model.translate(model.createMutation.isPending
          ? "adminInvites.creation.pending"
          : "adminInvites.creation.action")}
      </Button>
      <AdminInviteFeedback {...model} />
      <AdminCollectionToolbar
        filters={inviteFilters(model.translate)}
        hasFilters={model.collection.hasFilters}
        labels={collectionLabels(model.translate)}
        onFilter={model.collection.setFilter}
        onReset={model.collection.resetFilters}
        onSearch={model.collection.setSearch}
        onSort={model.collection.setSort}
        sorts={inviteSorts(model.translate)}
        state={model.collection.state}
      />
      <AdminCollectionResults
        errorMessage={(error) => inviteErrorMessage(error, model.translate)}
        hasFilters={model.collection.hasFilters}
        items={invites}
        messages={resultMessages(model.translate)}
        onPage={model.collection.setPage}
        onPageSize={model.collection.setPageSize}
        onReset={model.collection.resetFilters}
        query={model.query}
        renderDesktop={() => (
          <AdminInviteTable invites={invites} model={model} />
        )}
        renderMobile={() => <AdminInviteCards invites={invites} model={model} />}
        state={model.collection.state}
      />
      <AdminInviteDialogs model={model} />
    </Stack>
  );
}

/** @returns {object} Query, URL, mutations, selection, and focus model. */
function useAdminInvitePageModel() {
  const { t: translate } = useTranslation();
  const collection = useAdminCollectionState(inviteCollection);
  const query = useAdminInvites(collection.state);
  const createMutation = useCreateAdminInvite();
  const revokeMutation = useRevokeAdminInvite();
  const [selectedInvite, setSelectedInvite] = useState(null);
  const feedbackRef = useRef(null);

  useEffect(() => {
    if (query.isError || createMutation.isError || revokeMutation.isSuccess) {
      feedbackRef.current?.focus();
    }
  }, [createMutation.isError, query.isError, revokeMutation.isSuccess]);

  return {
    collection,
    createInvite() {
      createMutation.reset();
      createMutation.mutate();
    },
    createMutation,
    feedbackRef,
    openRevocation(invite) {
      revokeMutation.reset();
      setSelectedInvite(invite);
    },
    query,
    revokeMutation,
    selectedInvite,
    setSelectedInvite,
    translate,
  };
}

/** @returns {import("react").ReactElement} Incidental Invite dialogs. */
function AdminInviteDialogs({ model }) {
  const closeRevocation = () => {
    model.revokeMutation.reset();
    model.setSelectedInvite(null);
  };

  return (
    <>
      <AdminInviteCreationDialog
        onClose={() => model.createMutation.reset()}
        translate={model.translate}
        url={model.createMutation.data?.invite.url ?? null}
      />
      <AdminInviteRevocationDialog
        invite={model.selectedInvite}
        mutation={model.revokeMutation}
        onClose={closeRevocation}
        onConfirm={() => model.revokeMutation.mutate(model.selectedInvite, {
          onSuccess: () => model.setSelectedInvite(null),
        })}
        translate={model.translate}
      />
    </>
  );
}

/** @returns {import("react").ReactElement | null} Focused page-level result. */
function AdminInviteFeedback(model) {
  if (model.revokeMutation.isSuccess) {
    return (
      <Alert ref={model.feedbackRef} role="status" severity="success" tabIndex={-1}>
        {model.translate("adminInvites.revocation.success")}
      </Alert>
    );
  }

  return model.createMutation.error === null ? null : (
    <Alert ref={model.feedbackRef} severity="error" tabIndex={-1}>
      {inviteErrorMessage(model.createMutation.error, model.translate)}
    </Alert>
  );
}

/** @returns {import("react").ReactElement} Wide semantic Invite table. */
function AdminInviteTable({ invites, model }) {
  const heading = (field, key) => (
    <AdminCollectionSortLabel
      field={field}
      onSort={model.collection.toggleSort}
      state={model.collection.state}
    >
      {model.translate(key)}
    </AdminCollectionSortLabel>
  );

  return (
    <TableContainer>
      <Table aria-label={model.translate("adminInvites.tableLabel")}>
        <TableHead>
          <TableRow>
            <TableCell sortDirection={sortDirection(model.collection, "createdAt")}>{heading("createdAt", "adminInvites.fields.createdAt")}</TableCell>
            <TableCell sortDirection={sortDirection(model.collection, "state")}>{heading("state", "adminInvites.fields.state")}</TableCell>
            <TableCell>{model.translate("adminInvites.fields.action")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invites.map((invite) => (
            <TableRow key={invite.id}>
              <TableCell component="th" scope="row"><InviteTime invite={invite} /></TableCell>
              <TableCell><InviteState invite={invite} translate={model.translate} /></TableCell>
              <TableCell><InviteAction invite={invite} model={model} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow named Invite card list. */
function AdminInviteCards({ invites, model }) {
  return (
    <List aria-label={model.translate("adminInvites.listLabel")} disablePadding>
      {invites.map((invite) => (
        <ListItem disablePadding key={invite.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h3">
                  {model.translate("adminInvites.itemTitle")}
                </Typography>
                <InviteTime invite={invite} />
                <InviteState invite={invite} translate={model.translate} />
                <InviteAction invite={invite} model={model} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} Semantic Invite creation instant. */
function InviteTime({ invite }) {
  const created = new Date(invite.createdAt * 1000);

  return (
    <Typography component="time" dateTime={created.toISOString()}>
      {new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(created)}
    </Typography>
  );
}

/** @returns {import("react").ReactElement} Explicit Invite state. */
function InviteState({ invite, translate }) {
  return (
    <Chip
      color={invite.state === "active" ? "success" : "default"}
      label={translate(`adminInvites.state.${invite.state}`)}
      sx={{ alignSelf: "flex-start" }}
      variant={invite.state === "active" ? "filled" : "outlined"}
    />
  );
}

/** @returns {import("react").ReactElement | null} Current Invite action. */
function InviteAction({ invite, model }) {
  return invite.state !== "active" ? null : (
    <Button color="error" onClick={() => model.openRevocation(invite)} variant="outlined">
      {model.translate("adminInvites.revocation.action")}
    </Button>
  );
}

/** @returns {string} Localized Invite collection/mutation failure. */
function inviteErrorMessage(error, translate) {
  return translate(new Set([
    "admin-not-active",
    "disabled-admin",
    "no-admin-user",
    "unauthenticated",
  ]).has(error?.outcome)
    ? "adminInvites.status.unavailable"
    : "adminInvites.status.technicalError");
}

/** @returns {"asc" | "desc" | false} Accessible active sort direction. */
function sortDirection(collection, field) {
  return collection.state.sortField === field
    ? collection.state.sortDirection
    : false;
}
