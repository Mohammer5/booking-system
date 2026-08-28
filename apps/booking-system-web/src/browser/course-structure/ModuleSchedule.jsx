import { Box, Stack, Typography } from "@mui/material";

/**
 * Present both definite interval endpoints without hiding Course-local meaning.
 *
 * @param {object} props Module schedule properties.
 * @returns {import("react").ReactElement} Semantic schedule details.
 */
export function ModuleSchedule({ module, timezone, translate }) {
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

/** @returns {import("react").ReactElement} One description-list pair. */
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
