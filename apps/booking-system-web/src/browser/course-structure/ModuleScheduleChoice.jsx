import {
  Alert,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";

/**
 * Present a resolved endpoint or require one explicit overlap occurrence.
 *
 * @param {object} props Schedule-choice properties.
 * @returns {import("react").ReactElement} Resolution presentation.
 */
export function ModuleScheduleChoice(props) {
  const {
    field,
    focusRef,
    idPrefix,
    onSelect,
    resolution,
    selected,
    translate,
  } = props;

  if (resolution.outcome === "resolved") {
    return (
      <Alert severity="info">
        {translate("courseStructure.module.resolvedInstant", {
          field: scheduleFieldLabel(field, translate),
          instant: resolution.instant,
          offset: formatOffset(resolution.offsetMinutes),
        })}
      </Alert>
    );
  }

  const labelId = `${idPrefix}-${field}-occurrence-label`;

  return (
    <FormControl ref={focusRef} required>
      <FormLabel id={labelId}>
        {translate("courseStructure.module.occurrenceLabel", {
          field: scheduleFieldLabel(field, translate),
        })}
      </FormLabel>
      <RadioGroup
        aria-labelledby={labelId}
        name={`${idPrefix}-${field}Occurrence`}
        onChange={(event) => onSelect(field, event.target.value)}
        value={selected ?? ""}
      >
        {resolution.candidates.map((candidate) => (
          <FormControlLabel
            control={<Radio />}
            key={candidate.occurrence}
            label={<CandidateLabel candidate={candidate} translate={translate} />}
            value={candidate.occurrence}
          />
        ))}
      </RadioGroup>
      <FormHelperText>
        {translate("courseStructure.module.occurrenceRequired")}
      </FormHelperText>
    </FormControl>
  );
}

/**
 * Present one occurrence with both offset and definite instant.
 *
 * @param {object} props Candidate presentation properties.
 * @returns {import("react").ReactElement} Radio label.
 */
function CandidateLabel({ candidate, translate }) {
  return (
    <Stack component="span" spacing={0.25}>
      <Typography component="span">
        {translate(
          `courseStructure.module.occurrence.${candidate.occurrence}`,
        )}
      </Typography>
      <Typography component="span" variant="body2">
        {translate("courseStructure.module.occurrenceInstant", {
          offset: formatOffset(candidate.offsetMinutes),
          instant: candidate.instant,
        })}
      </Typography>
    </Stack>
  );
}

/**
 * Resolve the localized label for one schedule endpoint.
 *
 * @param {"startsAt" | "endsAt"} field Schedule field.
 * @param {(key: string) => string} translate Translation function.
 * @returns {string} Localized field label.
 */
function scheduleFieldLabel(field, translate) {
  return translate(
    field === "startsAt"
      ? "courseStructure.module.startsAt"
      : "courseStructure.module.endsAt",
  );
}

/**
 * Format one timezone offset without treating it as the Course timezone.
 *
 * @param {number} offsetMinutes Candidate offset minutes.
 * @returns {string} Signed UTC offset.
 */
function formatOffset(offsetMinutes) {
  const sign = offsetMinutes < 0 ? "−" : "+";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
}
