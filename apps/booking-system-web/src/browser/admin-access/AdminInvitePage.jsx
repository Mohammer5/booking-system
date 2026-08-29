import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminInviteCreationDialog } from "./AdminInviteCreationDialog.jsx";
import { AdminInviteRevocationDialog } from "./AdminInviteRevocationDialog.jsx";
import {
  useAdminInvites,
  useCreateAdminInvite,
  useRevokeAdminInvite,
} from "./useAdminInvites.js";

/** @returns {import("react").ReactElement} Stable Admin Invite administration view. */
export function AdminInvitePage() {
  const model = useAdminInvitePageModel();

  return (
    <Stack component="section" spacing={3}>
      <Typography component="h1" variant="h1">
        {model.translate("adminInvites.title")}
      </Typography>
      <Typography>{model.translate("adminInvites.description")}</Typography>
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
      <AdminInviteList {...model} />
      <AdminInviteCreationDialog
        onClose={() => model.createMutation.reset()}
        translate={model.translate}
        url={model.createMutation.data?.invite.url ?? null}
      />
      <AdminInviteRevocationDialog
        invite={model.selectedInvite}
        mutation={model.revokeMutation}
        onClose={model.closeRevocation}
        onConfirm={model.confirmRevocation}
        translate={model.translate}
      />
    </Stack>
  );
}

/** @returns {object} Query, mutations, selection, and focus model. */
function useAdminInvitePageModel() {
  const { t: translate } = useTranslation();
  const query = useAdminInvites();
  const createMutation = useCreateAdminInvite();
  const revokeMutation = useRevokeAdminInvite();
  const [selectedInvite, setSelectedInvite] = useState(null);
  const feedbackRef = useRef(null);

  useEffect(() => {
    if (query.isError || createMutation.isError || revokeMutation.isSuccess) {
      feedbackRef.current?.focus();
    }
  }, [createMutation.isError, query.isError, revokeMutation.isSuccess]);

  const openRevocation = (invite) => {
    revokeMutation.reset();
    setSelectedInvite(invite);
  };
  const closeRevocation = () => {
    revokeMutation.reset();
    setSelectedInvite(null);
  };
  const confirmRevocation = () => revokeMutation.mutate(selectedInvite, {
    onSuccess: () => setSelectedInvite(null),
  });
  const createInvite = () => {
    createMutation.reset();
    createMutation.mutate();
  };

  return {
    closeRevocation,
    confirmRevocation,
    createInvite,
    createMutation,
    feedbackRef,
    openRevocation,
    query,
    revokeMutation,
    selectedInvite,
    translate,
  };
}

/** @returns {import("react").ReactElement | null} Focused page-level result. */
function AdminInviteFeedback(props) {
  if (props.revokeMutation.isSuccess) {
    return (
      <Alert ref={props.feedbackRef} role="status" severity="success" tabIndex={-1}>
        {props.translate("adminInvites.revocation.success")}
      </Alert>
    );
  }

  const error = props.query.error ?? props.createMutation.error;

  return error === null ? null : (
    <Alert ref={props.feedbackRef} severity="error" tabIndex={-1}>
      {props.translate(error.outcome === "admin-not-active"
        ? "adminInvites.status.unavailable"
        : "adminInvites.status.technicalError")}
    </Alert>
  );
}

/** @returns {import("react").ReactElement | null} Current list/query state. */
function AdminInviteList({ openRevocation, query, translate }) {
  if (query.isPending) {
    return (
      <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>{translate("adminInvites.status.loading")}</Typography>
      </Stack>
    );
  }

  if (query.isError) return null;
  if (query.data.invites.length === 0) {
    return <Alert severity="info">{translate("adminInvites.status.empty")}</Alert>;
  }

  return (
    <Stack aria-label={translate("adminInvites.listLabel")} spacing={2}>
      {query.data.invites.map((invite) => (
        <AdminInviteCard
          invite={invite}
          key={invite.id}
          openRevocation={openRevocation}
          translate={translate}
        />
      ))}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One non-secret Invite row. */
function AdminInviteCard({ invite, openRevocation, translate }) {
  const created = new Date(invite.createdAt * 1000);

  return (
    <Paper
      aria-label={translate("adminInvites.itemLabel", { id: invite.id })}
      component="article"
      variant="outlined"
      sx={{ overflowWrap: "anywhere", p: 2 }}
    >
      <Stack spacing={1.5}>
        <Typography component="h2" variant="h3">
          {translate("adminInvites.itemTitle")}
        </Typography>
        <Typography component="time" dateTime={created.toISOString()}>
          {translate("adminInvites.createdAt", {
            value: new Intl.DateTimeFormat("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(created),
          })}
        </Typography>
        <Chip
          color={invite.state === "active" ? "success" : "default"}
          label={translate(`adminInvites.state.${invite.state}`)}
          sx={{ alignSelf: "flex-start" }}
          variant={invite.state === "active" ? "filled" : "outlined"}
        />
        {invite.state === "active" ? (
          <Button
            color="error"
            onClick={() => openRevocation(invite)}
            sx={{ alignSelf: "flex-start" }}
            variant="outlined"
          >
            {translate("adminInvites.revocation.action")}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
