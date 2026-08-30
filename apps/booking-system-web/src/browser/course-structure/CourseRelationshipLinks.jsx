import { Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router";

/** @returns {import("react").ReactElement} Linked child-resource counts. */
export function CourseRelationshipLinks({ course, translate }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <RelationshipLink course={course} resource="participants">
        {translate("courseAccess.courseParticipants.summary", {
          count: course.counts.participants,
        })}
      </RelationshipLink>
      <RelationshipLink course={course} resource="groups">
        {translate("courseStructure.group.summary", {
          count: course.counts.groups,
        })}
      </RelationshipLink>
      <RelationshipLink course={course} resource="modules">
        {translate("courseStructure.module.summary", {
          count: course.counts.modules,
        })}
      </RelationshipLink>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One stable nested collection link. */
function RelationshipLink({ children, course, resource }) {
  return (
    <Button component={RouterLink} sx={{ alignSelf: "flex-start" }}
      to={`/admin/courses/${course.id}/${resource}`} variant="outlined">
      {children}
    </Button>
  );
}
