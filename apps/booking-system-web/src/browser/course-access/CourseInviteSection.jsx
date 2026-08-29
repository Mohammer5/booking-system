import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseInviteDialog } from "./CourseInviteDialog.jsx";
import {
  useCreateCourseInvite,
  useCurrentCourseInvite,
  useDisableCourseInvite,
  useReenableCourseInvite,
  useReplaceCourseInvite,
} from "./useCourseInvites.js";

/**
 * Present one Active Course's shared Invite management.
 *
 * @param {object} props Component properties.
 * @returns {import("react").ReactElement} Course Invite section.
 */
export function CourseInviteSection({ course }) {
  const model = useCourseInviteSectionModel(course);

  return (
    <Stack aria-labelledby="course-invite-title" component="section" spacing={2}>
      <Divider />
      <Typography component="h2" id="course-invite-title" variant="h2">
        {model.translate("courseAccess.invite.title")}
      </Typography>
      <Typography>{model.translate("courseAccess.invite.description")}</Typography>
      <CourseInviteState {...model} />
      <CourseInviteFeedback {...model} />
      <CourseInviteDialog
        action={model.dialogAction}
        error={model.activeDialogMutation.error}
        isPending={model.activeDialogMutation.isPending}
        onClose={model.closeDialog}
        onConfirm={model.confirmDialog}
        open={model.dialogAction !== null}
        translate={model.translate}
      />
    </Stack>
  );
}

/** @returns {object} State and handlers for one Invite section. */
function useCourseInviteSectionModel(course) {
  const { t: translate } = useTranslation();
  const query = useCurrentCourseInvite(course.id);
  const invite = query.data?.invite ?? null;
  const mutations = useInviteMutations(course.id, invite?.id);
  const feedback = useInviteFeedback(query);
  const [dialogAction, setDialogAction] = useState(null);
  const activeDialogMutation = dialogMutation(
    dialogAction,
    mutations.disableMutation,
    mutations.replaceMutation,
  );
  const openDialog = (action) => {
    dialogMutation(
      action,
      mutations.disableMutation,
      mutations.replaceMutation,
    ).reset();
    setDialogAction(action);
  };
  const confirmDialog = () => activeDialogMutation.mutate(undefined, {
    onSuccess(result) {
      setDialogAction(null);
      feedback.announce(result.outcome);
    },
  });
  const runDirectMutation = (mutation) => {
    feedback.reset();
    mutation.mutate(undefined, {
      onSuccess: (result) => feedback.announce(result.outcome),
      onError: feedback.fail,
    });
  };
  const copyInvite = () => copyCourseInvite(invite, feedback);

  return {
    ...mutations,
    ...feedback,
    activeDialogMutation,
    closeDialog: () => setDialogAction(null),
    confirmDialog,
    copyInvite,
    dialogAction,
    invite,
    openDialog,
    query,
    runDirectMutation,
    translate,
  };
}

/** @returns {object} Stable lifecycle mutation collection. */
function useInviteMutations(courseId, inviteId) {
  return {
    createMutation: useCreateCourseInvite(courseId),
    disableMutation: useDisableCourseInvite(courseId, inviteId),
    reenableMutation: useReenableCourseInvite(courseId, inviteId),
    replaceMutation: useReplaceCourseInvite(courseId, inviteId),
  };
}

/** @returns {object} Focused status announcement and error state. */
function useInviteFeedback(query) {
  const resultRef = useRef(null);
  const errorRef = useRef(null);
  const [announcement, setAnnouncement] = useState(null);
  const [directError, setDirectError] = useState(null);

  useEffect(() => {
    if (announcement !== null) resultRef.current?.focus();
  }, [announcement]);
  useEffect(() => {
    if (query.isError || directError !== null) errorRef.current?.focus();
  }, [directError, query.isError]);

  return {
    announce: setAnnouncement,
    announcement,
    directError,
    errorRef,
    fail: setDirectError,
    reset() {
      setAnnouncement(null);
      setDirectError(null);
    },
    resultRef,
  };
}

/** @returns {Promise<void>} Copy current URL and announce exact result. */
async function copyCourseInvite(invite, feedback) {
  feedback.reset();
  try {
    await navigator.clipboard.writeText(invite.url);
    feedback.announce("copied");
  } catch {
    feedback.fail({ outcome: "technical-error" });
  }
}

/** @returns {import("react").ReactElement | null} Result or failure message. */
function CourseInviteFeedback(props) {
  if (props.announcement !== null) {
    return (
      <Alert ref={props.resultRef} role="status" severity="success" tabIndex={-1}>
        {props.translate(`courseAccess.invite.${props.announcement}`)}
      </Alert>
    );
  }

  const error = props.query.error ?? props.directError;

  return error === null ? null : (
    <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
      {inviteError(error, props.translate)}
    </Alert>
  );
}

/** @returns {import("react").ReactElement} Current query/data state. */
function CourseInviteState(props) {
  if (props.query.isPending) {
    return (
      <Stack
        aria-live="polite"
        role="status"
        spacing={1}
        sx={{ alignItems: "center" }}
      >
        <CircularProgress aria-hidden="true" size={30} />
        <Typography>{props.translate("courseAccess.invite.loading")}</Typography>
      </Stack>
    );
  }

  if (props.query.isError) return null;
  if (props.invite === null) {
    return (
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        <Alert severity="info">{props.translate("courseAccess.invite.none")}</Alert>
        <Button
          disabled={props.createMutation.isPending}
          onClick={() => props.runDirectMutation(props.createMutation)}
          variant="contained"
        >
          {props.translate(props.createMutation.isPending
            ? "courseAccess.invite.createPending"
            : "courseAccess.invite.create")}
        </Button>
      </Stack>
    );
  }

  return <CurrentCourseInvite {...props} />;
}

/** @returns {import("react").ReactElement} Recoverable current Invite actions. */
function CurrentCourseInvite(props) {
  const isEnabled = props.invite.state === "enabled";

  return (
    <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
      <Chip
        color={isEnabled ? "success" : "default"}
        label={props.translate(`courseAccess.invite.state.${props.invite.state}`)}
        variant={isEnabled ? "filled" : "outlined"}
      />
      <Box
        component="code"
        sx={{ bgcolor: "action.hover", maxWidth: "100%", overflowWrap: "anywhere", p: 1.5 }}
      >
        {props.invite.url}
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button onClick={props.copyInvite} variant="outlined">
          {props.translate("courseAccess.invite.copy")}
        </Button>
        {isEnabled ? (
          <Button color="error" onClick={() => props.openDialog("disablement")}>
            {props.translate("courseAccess.invite.disable")}
          </Button>
        ) : (
          <Button
            disabled={props.reenableMutation.isPending}
            onClick={() => props.runDirectMutation(props.reenableMutation)}
          >
            {props.translate(props.reenableMutation.isPending
              ? "courseAccess.invite.reenablePending"
              : "courseAccess.invite.reenable")}
          </Button>
        )}
        <Button color="error" onClick={() => props.openDialog("replacement")}>
          {props.translate("courseAccess.invite.replace")}
        </Button>
      </Stack>
    </Stack>
  );
}

/** @returns {object} Mutation associated with one confirmation action. */
function dialogMutation(action, disableMutation, replaceMutation) {
  return action === "replacement" ? replaceMutation : disableMutation;
}

/** @returns {string} Exact stale/unavailable or sanitized failure. */
function inviteError(error, translate) {
  return error?.outcome === "technical-error"
    ? translate("courseAccess.invite.technicalError")
    : translate("courseAccess.invite.stale");
}
