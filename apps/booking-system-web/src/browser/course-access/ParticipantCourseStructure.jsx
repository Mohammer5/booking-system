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

/**
 * Present ordered Participant-relevant Module and Active Group structure.
 *
 * @param {object} props Course structure properties.
 * @returns {import("react").ReactElement} Read-only Course structure.
 */
export function ParticipantCourseStructure({ course, translate }) {
  return (
    <>
      <ParticipantModuleList course={course} translate={translate} />
      <ParticipantGroupList groups={course.groups} translate={translate} />
    </>
  );
}

/** @returns {import("react").ReactElement} Ordered Module section. */
function ParticipantModuleList({ course, translate }) {
  return (
    <Stack aria-labelledby="participant-modules-title" component="section" spacing={2}>
      <Typography component="h2" id="participant-modules-title" variant="h2">
        {translate("courseAccess.participantCourses.modules.title")}
      </Typography>
      {course.modules.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.participantCourses.modules.empty")}
        </Alert>
      ) : (
        <List
          aria-label={translate("courseAccess.participantCourses.modules.label")}
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
      )}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Read-only Module information. */
function ModuleCard({ module, timezone, translate }) {
  const stateKey =
    module.state === "cancelled" ? "cancelled" : "scheduled";

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
              label={translate(
                `courseAccess.participantCourses.modules.${stateKey}`,
              )}
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
          <Stack spacing={1}>
            <Typography component="h4" variant="h4">
              {translate("courseAccess.participantCourses.selection.title")}
            </Typography>
            <Chip
              label={translate("courseAccess.participantCourses.selection.none")}
              sx={{ alignSelf: "flex-start" }}
              variant="outlined"
            />
            <Typography>
              {translate("courseAccess.participantCourses.selection.noneDescription")}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {import("react").ReactElement} Definite Module interval. */
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
      <ScheduleTerm label={translate("courseAccess.participantCourses.modules.startsAt")}>
        <InstantValue instant={module.startsAt} timezone={timezone} />
      </ScheduleTerm>
      <ScheduleTerm label={translate("courseAccess.participantCourses.modules.endsAt")}>
        <InstantValue instant={module.endsAt} timezone={timezone} />
      </ScheduleTerm>
    </Box>
  );
}

/** @returns {import("react").ReactElement} Ordered Active Group section. */
function ParticipantGroupList({ groups, translate }) {
  return (
    <Stack aria-labelledby="participant-groups-title" component="section" spacing={2}>
      <Typography component="h2" id="participant-groups-title" variant="h2">
        {translate("courseAccess.participantCourses.groups.title")}
      </Typography>
      {groups.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.participantCourses.groups.empty")}
        </Alert>
      ) : (
        <List
          aria-label={translate("courseAccess.participantCourses.groups.label")}
          disablePadding
        >
          {groups.map((group) => (
            <ListItem disablePadding key={group.id} sx={{ mb: 2 }}>
              <Card sx={{ width: "100%" }} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{
                        alignItems: { sm: "center" },
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography component="h3" variant="h3">
                        {group.name}
                      </Typography>
                      <Chip
                        color="success"
                        label={translate(
                          "courseAccess.participantCourses.state.active",
                        )}
                      />
                    </Stack>
                    {group.details === null ? null : (
                      <Typography>{group.details}</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One semantic schedule pair. */
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

/** @returns {import("react").ReactElement} Course-local and definite time. */
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
