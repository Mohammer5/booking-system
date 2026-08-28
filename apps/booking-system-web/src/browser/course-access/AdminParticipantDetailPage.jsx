import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router";

import { ParticipantProfileForm } from "./ParticipantProfileForm.jsx";
import { ParticipantLifecycleControl } from "./ParticipantLifecycleControl.jsx";
import {
  useParticipantDetail,
  useUpdateParticipantProfileAsAdmin,
} from "./useCourseAccess.js";

/** @returns {import("react").ReactElement} Admin Participant detail/edit route. */
export function AdminParticipantDetailPage() {
  const { participantId } = useParams();
  const participantQuery = useParticipantDetail(participantId);
  const mutation = useUpdateParticipantProfileAsAdmin(participantId);
  const errorRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (participantQuery.isError) errorRef.current?.focus();
  }, [participantQuery.isError]);

  return (
    <Paper elevation={2} sx={{ mx: "auto", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <Typography component="h1" variant="h1">
          {t("courseAccess.profile.adminTitle")}
        </Typography>
        <Typography>{t("courseAccess.profile.adminDescription")}</Typography>
        <Button
          component={RouterLink}
          sx={{ alignSelf: "flex-start" }}
          to="/admin/participants"
        >
          {t("courseAccess.profile.toDirectory")}
        </Button>
        <AdminParticipantDetailState
          errorRef={errorRef}
          mutation={mutation}
          participantQuery={participantQuery}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Current Admin detail state. */
function AdminParticipantDetailState(props) {
  if (props.participantQuery.isPending) {
    return (
      <Stack role="status" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-hidden="true" size={36} />
        <Typography>{props.translate("courseAccess.profile.loading")}</Typography>
      </Stack>
    );
  }

  if (props.participantQuery.isError) {
    return (
      <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
        {props.translate(
          props.participantQuery.error.outcome === "technical-error"
            ? "courseAccess.profile.technicalError"
            : "courseAccess.profile.adminUnavailable",
        )}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Chip
        color={
          props.participantQuery.data.state === "active" ? "success" : "default"
        }
        label={props.translate(
          `courseAccess.participantState.${props.participantQuery.data.state}`,
        )}
        sx={{ alignSelf: "flex-start" }}
        variant="outlined"
      />
      <ParticipantLifecycleControl
        participant={props.participantQuery.data}
        translate={props.translate}
      />
      <ParticipantProfileForm
        mode="admin"
        mutation={props.mutation}
        participant={props.participantQuery.data}
        translate={props.translate}
      />
    </Stack>
  );
}
