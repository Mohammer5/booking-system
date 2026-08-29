import { Alert, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router";

import {
  AdminAuthorityChip,
  AdminStateChip,
} from "./AdminUserDirectoryPage.jsx";
import { AdminUserLifecycleControls } from "./AdminUserLifecycleControls.jsx";
import { AdminUserNameForm } from "./AdminUserNameForm.jsx";
import { AdminUserPromotionControl } from "./AdminUserPromotionControl.jsx";
import { useAdminUser, useUpdateAdminUserName } from "./useAdminUsers.js";

/** @returns {import("react").ReactElement} Direct Admin User detail/edit route. */
export function AdminUserDetailPage() {
  const { adminUserId } = useParams();
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const query = useAdminUser(adminUserId);
  const mutation = useUpdateAdminUserName(adminUserId);
  const errorRef = useRef(null);

  useEffect(() => {
    if (query.isError) errorRef.current?.focus();
  }, [query.isError]);

  return (
    <Paper elevation={2} sx={{ mx: "auto", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3} sx={{ overflowWrap: "anywhere" }}>
        <Typography component="h1" variant="h1">
          {translate("adminUsers.detail.title")}
        </Typography>
        <Typography>{translate("adminUsers.detail.description")}</Typography>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin/users"
        >
          {translate("adminUsers.detail.toDirectory")}
        </Button>
        <AdminUserDetailState
          errorRef={errorRef}
          mutation={mutation}
          onDeleted={(adminUser) => navigate("/admin/users", {
            state: {
              adminUserLifecycleSuccess: {
                action: "delete",
                name: adminUser.name,
              },
            },
          })}
          query={query}
          translate={translate}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Current detail route state. */
function AdminUserDetailState({
  errorRef,
  mutation,
  onDeleted,
  query,
  translate,
}) {
  if (query.isPending) {
    return (
      <Stack role="status" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={36} />
        <Typography>{translate("adminUsers.detail.loading")}</Typography>
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {translate(query.error.outcome === "technical-error"
          ? "adminUsers.status.technicalError"
          : "adminUsers.detail.unavailable")}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h2">{query.data.name}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        <AdminAuthorityChip adminUser={query.data} translate={translate} />
        <AdminStateChip adminUser={query.data} translate={translate} />
      </Stack>
      <AdminUserPromotionControl
        adminUser={query.data}
        translate={translate}
      />
      <AdminUserLifecycleControls
        adminUser={query.data}
        onDeleted={onDeleted}
        showRestriction
        translate={translate}
      />
      {query.data.isNameEditable ? (
        <AdminUserNameForm
          adminUser={query.data}
          mutation={mutation}
          translate={translate}
        />
      ) : (
        <Alert severity="info">{translate("adminUsers.detail.readOnly")}</Alert>
      )}
    </Stack>
  );
}
