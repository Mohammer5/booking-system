import {
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  captureCourseInviteToken,
  useRecognizedCourseInvite,
} from "./useCourseInvites.js";

/** @returns {import("react").ReactElement} Minimal public Invite route. */
export function CourseInvitePage() {
  const { t } = useTranslation();
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
    if (!query.isPending || token === null) resultRef.current?.focus();
  }, [query.isPending, token]);

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
          token={token}
          translate={t}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Narrow recognition state. */
function PublicInviteState({ query, resultRef, token, translate }) {
  if (token !== null && query.isPending) {
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

  if (token === null || query.error?.status === 404) {
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

  const isAvailable = query.data.outcome === "available";

  return (
    <Alert
      ref={resultRef}
      role="status"
      severity={isAvailable ? "success" : "warning"}
      tabIndex={-1}
    >
      <Typography component="h2" variant="h2">
        {query.data.courseName}
      </Typography>
      <Typography sx={{ mt: 1 }}>
        {translate(`courseAccess.publicInvite.${query.data.outcome}`)}
      </Typography>
    </Alert>
  );
}
