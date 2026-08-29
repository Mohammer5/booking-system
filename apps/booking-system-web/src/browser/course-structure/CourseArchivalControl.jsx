import { Button, Stack, Typography } from "@mui/material";

import { CourseArchivalDialog } from "./CourseArchivalDialog.jsx";
import { useCourseArchival } from "./useCourseArchival.js";

/** @returns {import("react").ReactElement} Terminal Course archival control. */
export function CourseArchivalControl(props) {
  const state = useCourseArchival(props.course, props.onArchived);

  return (
    <Stack
      aria-labelledby="course-archival-title"
      component="section"
      spacing={2}
    >
      <Typography component="h2" id="course-archival-title" variant="h2">
        {props.translate("courseStructure.archival.title")}
      </Typography>
      <Typography>
        {props.translate("courseStructure.archival.summary")}
      </Typography>
      <Button
        color="error"
        onClick={state.open}
        ref={state.actionRef}
        sx={{ alignSelf: "flex-start" }}
        type="button"
        variant="outlined"
      >
        {props.translate("courseStructure.archival.action")}
      </Button>
      {state.isOpen ? (
        <CourseArchivalDialog
          course={props.course}
          mutation={state.mutation}
          onCancel={state.cancel}
          onConfirm={state.confirm}
          translate={props.translate}
        />
      ) : null}
    </Stack>
  );
}
