import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  applyModuleFieldOutcome,
  isModuleFieldOutcome,
} from "./moduleCreationOutcomes.js";
import { useRescheduleModule } from "./useCourses.js";

/** @returns {object} Module schedule form, resolution, and focus state. */
export function useModuleRescheduling(course, module, translate) {
  const reschedule = useRescheduleModule(course.id, module.id);
  const form = useForm({ defaultValues: moduleScheduleValues(course, module) });
  const [disambiguation, setDisambiguation] = useState(null);
  const [occurrences, setOccurrences] = useState({});
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const choiceRef = useRef(null);
  const hasFormLevelError =
    reschedule.isError &&
    !isModuleFieldOutcome(reschedule.error?.outcome) &&
    reschedule.error?.outcome !== "schedule-disambiguation-required";
  const clearResolution = () => {
    reschedule.reset();
    setDisambiguation(null);
    setOccurrences({});
  };
  const submit = form.handleSubmit((values) => submitSchedule({
    disambiguation,
    form,
    occurrences,
    reschedule,
    setDisambiguation,
    setOccurrences,
    translate,
    values,
  }));

  useScheduleEffects({
    choiceRef,
    course,
    disambiguation,
    errorRef,
    form,
    hasFormLevelError,
    module,
    reschedule,
    setDisambiguation,
    setOccurrences,
    successRef,
  });

  return {
    choiceRef,
    clearResolution,
    disambiguation,
    errorRef,
    form,
    hasCompleteChoices: hasEveryOccurrence(disambiguation, occurrences),
    hasFormLevelError,
    occurrences,
    reschedule,
    selectOccurrence: (field, occurrence) => {
      setOccurrences((current) => ({ ...current, [field]: occurrence }));
    },
    submit,
    successRef,
  };
}

/** @returns {Promise<void>} Accept a schedule or expose exact field choices. */
async function submitSchedule(state) {
  state.reschedule.reset();
  state.form.clearErrors();

  try {
    const updatedModule = await state.reschedule.mutateAsync({
      startsAtLocal: state.values.startsAtLocal,
      startsAtOccurrence: state.occurrences.startsAt,
      endsAtLocal: state.values.endsAtLocal,
      endsAtOccurrence: state.occurrences.endsAt,
    });

    state.form.reset({
      startsAtLocal: state.values.startsAtLocal,
      endsAtLocal: state.values.endsAtLocal,
    });
    state.setDisambiguation(null);
    state.setOccurrences({});
    return updatedModule;
  } catch (error) {
    if (error.outcome === "schedule-disambiguation-required") {
      state.setDisambiguation(error.body.schedule);
      return;
    }

    applyModuleFieldOutcome(error, state.form, state.translate);
  }
}

/** @returns {void} Synchronize authoritative schedule and focus results. */
function useScheduleEffects(input) {
  useEffect(() => {
    input.form.reset(moduleScheduleValues(input.course, input.module));
    input.setDisambiguation(null);
    input.setOccurrences({});
  }, [
    input.course.timezone,
    input.form,
    input.module.endsAt,
    input.module.startsAt,
  ]);
  useEffect(() => {
    if (input.reschedule.isSuccess) input.successRef.current?.focus();
  }, [input.reschedule.isSuccess, input.successRef]);
  useEffect(() => {
    if (input.hasFormLevelError) input.errorRef.current?.focus();
  }, [input.errorRef, input.hasFormLevelError]);
  useEffect(() => {
    if (input.disambiguation !== null) {
      input.choiceRef.current?.querySelector("input")?.focus();
    }
  }, [input.choiceRef, input.disambiguation]);
}

/** @returns {object} Course-local input values for definite Module instants. */
function moduleScheduleValues(course, module) {
  return {
    startsAtLocal: instantToLocalInput(module.startsAt, course.timezone),
    endsAtLocal: instantToLocalInput(module.endsAt, course.timezone),
  };
}

/** @returns {string} One definite instant as a minute-precision local value. */
function instantToLocalInput(instant, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/** @returns {boolean} Whether every ambiguous endpoint has an occurrence. */
function hasEveryOccurrence(schedule, occurrences) {
  if (schedule === null) return true;

  return ["startsAt", "endsAt"].every(
    (field) =>
      schedule[field].outcome !== "disambiguation-required" ||
      occurrences[field] !== undefined,
  );
}
