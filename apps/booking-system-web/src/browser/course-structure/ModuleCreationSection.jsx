import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { ModuleCreationForm } from "./ModuleCreationForm.jsx";

/**
 * Present Scheduled Modules and the future-Module creation form.
 *
 * @param {object} props Course data properties.
 * @returns {import("react").ReactElement} Module detail section.
 */
export function ModuleCreationSection({ course }) {
  const { t } = useTranslation();

  return (
    <Stack aria-labelledby="course-modules-title" component="section" spacing={3}>
      <Typography component="h2" id="course-modules-title" variant="h2">
        {t("courseStructure.module.title")}
      </Typography>
      <ModuleList course={course} translate={t} />
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
function ModuleList({ course, translate }) {
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
          <ModuleCard
            module={module}
            timezone={course.timezone}
            translate={translate}
          />
        </ListItem>
      ))}
    </List>
  );
}

/**
 * Present one Module with Course-local and definite schedule meaning.
 *
 * @param {object} props Module card properties.
 * @returns {import("react").ReactElement} Module card.
 */
function ModuleCard({ module, timezone, translate }) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <Typography component="h3" variant="h3">
              {module.title}
            </Typography>
            <Chip
              label={translate("courseStructure.module.scheduled")}
            />
          </Stack>
          {module.description === null ? null : (
            <Typography>{module.description}</Typography>
          )}
          {module.instructions === null ? null : (
            <Typography>{module.instructions}</Typography>
          )}
          <ModuleSchedule
            module={module}
            timezone={timezone}
            translate={translate}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Present both definite interval endpoints without hiding Course-local meaning.
 *
 * @param {object} props Module schedule properties.
 * @returns {import("react").ReactElement} Semantic schedule details.
 */
function ModuleSchedule({ module, timezone, translate }) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: { xs: "1fr", sm: "minmax(8rem, 1fr) 2fr" },
        m: 0,
      }}
    >
      <ScheduleTerm label={translate("courseStructure.module.startsAt")}>
        <InstantValue instant={module.startsAt} timezone={timezone} />
      </ScheduleTerm>
      <ScheduleTerm label={translate("courseStructure.module.endsAt")}>
        <InstantValue instant={module.endsAt} timezone={timezone} />
      </ScheduleTerm>
    </Box>
  );
}

/**
 * Present one semantic schedule term and value.
 *
 * @param {object} props Schedule pair properties.
 * @returns {import("react").ReactElement} Description-list pair.
 */
function ScheduleTerm({ label, children }) {
  return (
    <>
      <Typography component="dt" fontWeight={700}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </>
  );
}

/**
 * Present Course-local time alongside the definite ISO instant.
 *
 * @param {object} props Instant presentation properties.
 * @returns {import("react").ReactElement} Local and definite time value.
 */
function InstantValue({ instant, timezone }) {
  const localValue = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(instant));

  return (
    <Stack component="span" spacing={0.5}>
      <span>{`${localValue} (${timezone})`}</span>
      <time dateTime={instant}>{instant}</time>
    </Stack>
  );
}
