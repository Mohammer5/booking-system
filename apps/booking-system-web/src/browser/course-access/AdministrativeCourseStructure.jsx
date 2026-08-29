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
 * Present all Admin-visible Modules and Groups for one Course.
 *
 * @param {object} props Structure and translation properties.
 * @returns {import("react").ReactElement} Course structure sections.
 */
export function AdministrativeCourseStructure({ data, translate }) {
  return (
    <>
      <AdministrativeModuleList
        course={data.course}
        modules={data.modules}
        translate={translate}
      />
      <AdministrativeGroupList
        groups={data.groups}
        translate={translate}
      />
    </>
  );
}

/** @returns {import("react").ReactElement} Ordered Module section. */
function AdministrativeModuleList({ course, modules, translate }) {
  return (
    <Stack aria-labelledby="admin-participation-modules" component="section" spacing={2}>
      <Typography component="h2" id="admin-participation-modules" variant="h2">
        {translate("courseAccess.adminParticipation.structure.modulesTitle")}
      </Typography>
      {modules.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.adminParticipation.structure.modulesEmpty")}
        </Alert>
      ) : (
        <List
          aria-label={translate(
            "courseAccess.adminParticipation.structure.modulesLabel",
          )}
          disablePadding
        >
          {modules.map((module) => (
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

/** @returns {import("react").ReactElement} One complete read-only Module. */
function ModuleCard({ module, timezone, translate }) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <StructureHeading
            name={module.title}
            state={translate(
              `courseAccess.adminParticipation.structure.${module.state}`,
            )}
          />
          <Typography>
            {module.description ??
              translate(
                "courseAccess.adminParticipation.structure.noDescription",
              )}
          </Typography>
          {module.instructions === null ? null : (
            <Typography>{module.instructions}</Typography>
          )}
          <Schedule
            module={module}
            timezone={timezone}
            translate={translate}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {import("react").ReactElement} Ordered all-Group section. */
function AdministrativeGroupList({ groups, translate }) {
  return (
    <Stack aria-labelledby="admin-participation-groups" component="section" spacing={2}>
      <Typography component="h2" id="admin-participation-groups" variant="h2">
        {translate("courseAccess.adminParticipation.structure.groupsTitle")}
      </Typography>
      {groups.length === 0 ? (
        <Alert role="status" severity="info">
          {translate("courseAccess.adminParticipation.structure.groupsEmpty")}
        </Alert>
      ) : (
        <List
          aria-label={translate(
            "courseAccess.adminParticipation.structure.groupsLabel",
          )}
          disablePadding
        >
          {groups.map((group) => (
            <ListItem disablePadding key={group.id} sx={{ mb: 2 }}>
              <GroupCard group={group} translate={translate} />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One complete read-only Group. */
function GroupCard({ group, translate }) {
  return (
    <Card sx={{ width: "100%" }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <StructureHeading
            name={group.name}
            state={translate(
              `courseAccess.adminParticipation.structure.${
                group.state === "active" ? "activeGroup" : "archivedGroup"
              }`,
            )}
          />
          <Typography>
            {group.details ??
              translate("courseAccess.adminParticipation.structure.noDetails")}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** @returns {import("react").ReactElement} Structure name and textual state. */
function StructureHeading({ name, state }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
    >
      <Typography component="h3" variant="h3">
        {name}
      </Typography>
      <Chip label={state} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Semantic Module interval. */
function Schedule({ module, timezone, translate }) {
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
      <ScheduleTerm
        label={translate("courseAccess.adminParticipation.structure.startsAt")}
      >
        <InstantValue instant={module.startsAt} timezone={timezone} />
      </ScheduleTerm>
      <ScheduleTerm
        label={translate("courseAccess.adminParticipation.structure.endsAt")}
      >
        <InstantValue instant={module.endsAt} timezone={timezone} />
      </ScheduleTerm>
    </Box>
  );
}

/** @returns {import("react").ReactElement} One schedule term/value pair. */
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

/** @returns {import("react").ReactElement} Course-local and ISO instant. */
export function InstantValue({ instant, timezone }) {
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
