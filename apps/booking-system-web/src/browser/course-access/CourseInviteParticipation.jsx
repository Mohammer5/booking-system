import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ParticipantGoogleSignInButton } from "../participant-entry/ParticipantGoogleSignInButton.jsx";
import { ParticipantRegistrationForm } from "../participant-entry/ParticipantRegistrationForm.jsx";
import { ParticipantSignOutButton } from "../participant-entry/ParticipantSignOutButton.jsx";
import { useParticipantEntry } from "../participant-entry/useParticipantEntry.js";
import { continueCourseInviteWithGoogle } from "./continueCourseInviteWithGoogle.js";
import { useJoinCourseInvite } from "./useCourseInvites.js";

/** @returns {import("react").ReactElement} Recognized Invite participation flow. */
export function CourseInviteParticipation(props) {
  const { t } = useTranslation();
  const participantFlow = useParticipantEntry({
    continueWithGoogle: continueCourseInviteWithGoogle,
    enabled: true,
  });
  const joinMutation = useJoinCourseInvite();

  return (
    <Stack component="section" spacing={3}>
      <Typography component="h2" variant="h2">
        {props.courseName}
      </Typography>
      <ParticipationState
        courseName={props.courseName}
        isAuthenticationFailure={props.isAuthenticationFailure}
        joinMutation={joinMutation}
        participantFlow={participantFlow}
        translate={t}
      />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Fresh Participant/Join state. */
function ParticipationState(props) {
  if (props.joinMutation.isSuccess) {
    return <JoinedState {...props} />;
  }

  if (props.joinMutation.isPending) {
    return <LoadingState message={props.translate("courseAccess.publicInvite.joining")} />;
  }

  if (props.joinMutation.isError) {
    return <JoinRefusal {...props} />;
  }

  const query = props.participantFlow.currentParticipantQuery;

  if (query.isPending) {
    return <LoadingState message={props.translate("participantEntry.status.loading")} />;
  }

  if (query.isSuccess) {
    return <JoinDecision {...props} />;
  }

  return <ParticipantEntryState {...props} outcome={query.error?.outcome} />;
}

/** @returns {import("react").ReactElement} Pending context status. */
function LoadingState({ message }) {
  return (
    <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress aria-hidden="true" size={32} />
      <Typography>{message}</Typography>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Sign-in, onboarding, or refusal. */
function ParticipantEntryState(props) {
  if (props.outcome === "unauthenticated") {
    return (
      <Stack spacing={2}>
        {props.isAuthenticationFailure ? (
          <FocusedAlert severity="error">
            {props.translate("participantEntry.authentication.failure")}
          </FocusedAlert>
        ) : null}
        <Typography>
          {props.translate("courseAccess.publicInvite.signInDescription")}
        </Typography>
        <ParticipantGoogleSignInButton signInMutation={props.participantFlow.signInMutation} />
      </Stack>
    );
  }

  if (props.outcome === "no-participant") {
    return (
      <Stack spacing={2}>
        <Typography component="h3" variant="h3">
          {props.translate("participantEntry.onboarding.title")}
        </Typography>
        <Typography>{props.translate("courseAccess.publicInvite.onboardingDescription")}</Typography>
        <ParticipantRegistrationForm
          registrationMutation={props.participantFlow.registrationMutation}
        />
        <ParticipantSignOutButton signOutMutation={props.participantFlow.signOutMutation} />
      </Stack>
    );
  }

  const key = props.outcome === "disabled-participant"
    ? "disabledParticipant"
    : "technicalError";

  return (
    <Stack spacing={2}>
      <FocusedAlert severity={key === "technicalError" ? "error" : "warning"}>
        {props.translate(`courseAccess.publicInvite.${key}`)}
      </FocusedAlert>
      {props.outcome === "disabled-participant" ? (
        <ParticipantSignOutButton signOutMutation={props.participantFlow.signOutMutation} />
      ) : null}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Explicit Join confirmation. */
function JoinDecision(props) {
  const [isOpen, setIsOpen] = useState(false);
  const cancelRef = useRef(null);

  return (
    <>
      <Typography>{props.translate("courseAccess.publicInvite.joinDescription")}</Typography>
      <Button onClick={() => setIsOpen(true)} size="large" variant="contained">
        {props.translate("courseAccess.publicInvite.join")}
      </Button>
      <Dialog
        aria-describedby="course-invite-join-description"
        aria-labelledby="course-invite-join-title"
        disableAutoFocus
        onClose={() => setIsOpen(false)}
        open={isOpen}
        slotProps={{
          transition: {
            onEntered: () => cancelRef.current?.focus(),
            style: { opacity: 1 },
          },
        }}
        transitionDuration={0}
      >
        <DialogTitle id="course-invite-join-title">
          {props.translate("courseAccess.publicInvite.joinTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="course-invite-join-description">
            {props.translate("courseAccess.publicInvite.joinConfirmation", {
              courseName: props.courseName,
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)} ref={cancelRef}>
            {props.translate("courseAccess.publicInvite.cancel")}
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false);
              props.joinMutation.mutate();
            }}
            variant="contained"
          >
            {props.translate("courseAccess.publicInvite.joinConfirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** @returns {import("react").ReactElement} Accepted Join result and private link. */
function JoinedState({ joinMutation, translate }) {
  const result = joinMutation.data;

  return (
    <Stack spacing={2}>
      <FocusedAlert role="status" severity="success">
        {translate(`courseAccess.publicInvite.${result.outcome}`)}
      </FocusedAlert>
      <Button component={Link} to={`/courses/${result.course.id}`} variant="contained">
        {translate("courseAccess.publicInvite.toCourse")}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Safe stale or technical refusal. */
function JoinRefusal({ joinMutation, translate }) {
  const outcome = joinMutation.error.outcome;
  const keysByOutcome = {
    "assignment-revoked": "assignment-revoked",
    "disabled-participant": "disabledParticipant",
    "invite-unavailable": "invite-unavailable",
    "participant-not-active": "disabledParticipant",
  };
  const key = keysByOutcome[outcome] ?? "joinTechnicalError";

  return (
    <FocusedAlert severity={key === "joinTechnicalError" ? "error" : "warning"}>
      {translate(`courseAccess.publicInvite.${key}`)}
    </FocusedAlert>
  );
}

/** @returns {import("react").ReactElement} Alert focused after state change. */
function FocusedAlert(props) {
  const alertRef = useRef(null);

  useEffect(() => {
    alertRef.current?.focus();
  }, []);

  return <Alert {...props} ref={alertRef} tabIndex={-1} />;
}
