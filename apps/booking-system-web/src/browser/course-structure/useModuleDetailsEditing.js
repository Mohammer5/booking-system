import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import {
  applyModuleFieldOutcome,
  isModuleFieldOutcome,
} from "./moduleCreationOutcomes.js";
import { useUpdateModuleDetails } from "./useCourses.js";

/** @returns {object} Complete Module descriptive form and result state. */
export function useModuleDetailsEditing(courseId, module, translate) {
  const edit = useUpdateModuleDetails(courseId, module.id);
  const form = useForm({ defaultValues: moduleDetailValues(module) });
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const hasFormLevelError =
    edit.isError && !isModuleFieldOutcome(edit.error?.outcome);
  const submit = form.handleSubmit(async (values) => {
    edit.reset();
    form.clearErrors();

    try {
      const updatedModule = await edit.mutateAsync({
        title: values.title,
        description: values.description === "" ? null : values.description,
        instructions: values.instructions === "" ? null : values.instructions,
      });

      form.reset(moduleDetailValues(updatedModule));
    } catch (error) {
      applyModuleFieldOutcome(error, form, translate);
    }
  });

  useEffect(() => {
    form.reset(moduleDetailValues(module));
  }, [form, module.description, module.instructions, module.title]);
  useEffect(() => {
    if (edit.isSuccess) successRef.current?.focus();
  }, [edit.isSuccess]);
  useEffect(() => {
    if (hasFormLevelError) errorRef.current?.focus();
  }, [hasFormLevelError]);

  return {
    edit,
    errorRef,
    form,
    hasFormLevelError,
    submit,
    successRef,
  };
}

/** @returns {object} Complete transient descriptive values. */
function moduleDetailValues(module) {
  return {
    title: module.title,
    description: module.description ?? "",
    instructions: module.instructions ?? "",
  };
}
