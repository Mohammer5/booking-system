import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useRef } from "react";

import {
  CourseParticipantPicker,
  useCourseParticipantPicker,
} from "./CourseParticipantPicker.jsx";

/** @returns {import("react").ReactElement} Assisted-Selection target Dialog. */
export function AdminParticipationParticipantDialog(props) {
  const picker = useCourseParticipantPicker(props.courseId);
  const cancelRef = useRef(null);

  const submit = () => {
    const participantId = picker.requireSelection();

    if (participantId === null) return;
    props.onSelect(participantId);
  };

  return (
    <Dialog
      aria-describedby="participation-target-description"
      aria-labelledby="participation-target-title"
      fullWidth
      maxWidth="sm"
      onClose={props.onClose}
      open
      slotProps={{ transition: { onEntered: () => picker.searchRef.current?.focus() } }}
    >
      <DialogTitle id="participation-target-title">
        {props.translate("courseAccess.adminParticipation.target.title")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id="participation-target-description">
            {props.translate("courseAccess.adminParticipation.target.description")}
          </DialogContentText>
          <CourseParticipantPicker
            eligible={({ state }) => state === "active"}
            model={picker}
            translate={props.translate}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} ref={cancelRef}>
          {props.translate("courseAccess.adminParticipation.target.cancel")}
        </Button>
        <Button disabled={!picker.query.isSuccess} onClick={submit}
          variant="contained">
          {props.translate("courseAccess.adminParticipation.target.open")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
