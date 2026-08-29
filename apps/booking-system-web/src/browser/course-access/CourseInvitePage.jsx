import {
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { CourseInviteParticipation } from "./CourseInviteParticipation.jsx";
import {
  captureCourseInviteToken,
  useRecognizedCourseInvite,
} from "./useCourseInvites.js";

/** @returns {import("react").ReactElement} Minimal public Invite route. */
export function CourseInvitePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(captureCourseInviteToken);
  const query = useRecognizedCourseInvite(token);
  const refetchRecognition = query.refetch;
  const resultRef = useRef(null);

  useEffect(() => {
    const captureChangedFragment = () => {
      const changedToken = captureCourseInviteToken();

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
  }, [refetchRecognition, token]);

  useEffect(() => {
    if (!query.isPending) resultRef.current?.focus();
  }, [query.isPending]);

  return (
    <Paper
      component="section"
      elevation={2}
      sx={{ maxWidth: "42rem", mx: "auto", overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}
    >
      <Stack spacing={3}>
        <Typography component="h1" variant="h1">
          {t("courseAccess.publicInvite.title")}
        </Typography>
        <Typography>{t("courseAccess.publicInvite.description")}</Typography>
        <PublicInviteState
          query={query}
          resultRef={resultRef}
          isAuthenticationFailure={
            searchParams.get("authentication") === "failed"
          }
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Narrow recognition state. */
function PublicInviteState(props) {
  const { query, resultRef, translate } = props;

  if (query.isPending) {
    return (
      <Stack
        aria-live="polite"
        role="status"
        spacing={1}
        sx={{ alignItems: "center" }}
      >
        <CircularProgress aria-hidden="true" size={32} />
        <Typography>{translate("courseAccess.publicInvite.loading")}</Typography>
      </Stack>
    );
  }

  if (query.error?.status === 404) {
    return (
      <Alert ref={resultRef} severity="warning" tabIndex={-1}>
        {translate("courseAccess.publicInvite.unavailable")}
      </Alert>
    );
  }

  if (query.isError) {
    return (
      <Alert ref={resultRef} severity="error" tabIndex={-1}>
        {translate("courseAccess.publicInvite.technicalError")}
      </Alert>
    );
  }

  if (query.data.outcome === "available") {
    return (
      <CourseInviteParticipation
        courseName={query.data.courseName}
        isAuthenticationFailure={props.isAuthenticationFailure}
      />
    );
  }

  return (
    <Alert
      ref={resultRef}
      role="status"
      severity="warning"
      tabIndex={-1}
    >
      <Typography component="h2" variant="h2">
        {query.data.courseName}
      </Typography>
      <Typography sx={{ mt: 1 }}>
        {translate("courseAccess.publicInvite.unavailable")}
      </Typography>
    </Alert>
  );
}
