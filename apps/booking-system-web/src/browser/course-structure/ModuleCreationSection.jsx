import {
  Alert,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

import { ModuleCreationForm } from "./ModuleCreationForm.jsx";
import { ModuleManagementCard } from "./ModuleManagementCard.jsx";

/**
 * Present Scheduled Modules and the future-Module creation form.
 *
 * @param {object} props Course data properties.
 * @returns {import("react").ReactElement} Module detail section.
 */
export function ModuleCreationSection({ course }) {
  const { t } = useTranslation();
  const [deletionResult, setDeletionResult] = useState(null);
  const deletionSuccessRef = useRef(null);
  const deletedModuleTitle = deletionResult?.courseId === course.id
    ? deletionResult.moduleTitle
    : null;

  useEffect(() => {
    if (deletedModuleTitle !== null) deletionSuccessRef.current?.focus();
  }, [deletedModuleTitle, deletionResult]);

  return (
    <Stack aria-labelledby="course-modules-title" component="section" spacing={3}>
      <Typography component="h2" id="course-modules-title" variant="h2">
        {t("courseStructure.module.title")}
      </Typography>
      {deletedModuleTitle === null ? null : (
        <Alert
          ref={deletionSuccessRef}
          role="status"
          severity="success"
          tabIndex={-1}
        >
          {t("courseStructure.module.deleted", { title: deletedModuleTitle })}
        </Alert>
      )}
      <ModuleList
        course={course}
        onDeleted={(result) => setDeletionResult({
          courseId: course.id,
          moduleTitle: result.module.title,
        })}
        translate={t}
      />
      <ModuleCreationForm course={course} translate={t} />
    </Stack>
  );
}

/**
 * Present the empty or populated Module list.
 *
 * @param {object} props Module-list properties.
 * @returns {import("react").ReactElement} Current Module list state.
 */
function ModuleList({ course, onDeleted, translate }) {
  if (course.modules.length === 0) {
    return (
      <Alert role="status" severity="info">
        {translate("courseStructure.module.empty")}
      </Alert>
    );
  }

  return (
    <List
      aria-label={translate("courseStructure.module.listLabel")}
      disablePadding
    >
      {course.modules.map((module) => (
        <ListItem disablePadding key={module.id} sx={{ mb: 2 }}>
          <ModuleManagementCard
            course={course}
            module={module}
            onDeleted={onDeleted}
            translate={translate}
          />
        </ListItem>
      ))}
    </List>
  );
}
