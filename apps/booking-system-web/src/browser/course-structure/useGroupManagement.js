import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  useArchiveGroup,
  useReactivateGroup,
  useUpdateGroup,
} from "./useCourses.js";

/** @returns {object} Group form, lifecycle mutations, Dialog, and focus state. */
export function useGroupManagement(courseId, group, translate) {
  const form = useForm({ defaultValues: groupFormValues(group) });
  const [dialogAction, setDialogAction] = useState(null);
  const [lifecycleOutcome, setLifecycleOutcome] = useState(null);
  const [postDialogFocus, setPostDialogFocus] = useState(null);
  const currentAction = group.state === "active" ? "archive" : "reactivate";
  const mutations = useManagementMutations(courseId, group.id, dialogAction);
  const refs = useManagementRefs();
  const { archive, edit, lifecycleMutation, reactivate } = mutations;
  const hasEditFormError = edit.isError && !isGroupFieldOutcome(edit.error?.outcome);
  const submitEdit = createEditSubmit({ edit, form, translate });

  useGroupManagementEffects({
    ...refs,
    dialogAction,
    edit,
    form,
    group,
    lifecycleOutcome,
    postDialogFocus,
    setPostDialogFocus,
  });

  return {
    ...refs,
    cancelLifecycle: () => cancelLifecycle({
      lifecycleMutation,
      setDialogAction,
      setPostDialogFocus,
    }),
    confirmLifecycle: () => confirmLifecycle({
      action: dialogAction,
      form,
      mutation: lifecycleMutation,
      setDialogAction,
      setLifecycleOutcome,
      setPostDialogFocus,
      translate,
    }),
    currentAction,
    dialogAction,
    edit,
    form,
    hasEditFormError,
    lifecycleMutation,
    lifecycleOutcome,
    openLifecycle: () => openLifecycle({
      archive,
      currentAction,
      reactivate,
      setDialogAction,
      setLifecycleOutcome,
    }),
    submitEdit,
  };
}

/** @returns {object} Stable edit and current lifecycle mutation objects. */
function useManagementMutations(courseId, groupId, dialogAction) {
  const archive = useArchiveGroup(courseId, groupId);
  const edit = useUpdateGroup(courseId, groupId);
  const reactivate = useReactivateGroup(courseId, groupId);

  return {
    archive,
    edit,
    lifecycleMutation: dialogAction === "archive" ? archive : reactivate,
    reactivate,
  };
}

/** @returns {object} Stable Group action and result element refs. */
function useManagementRefs() {
  return {
    actionRef: useRef(null),
    editErrorRef: useRef(null),
    editSuccessRef: useRef(null),
    lifecycleSuccessRef: useRef(null),
  };
}

/** @returns {void} Synchronize source values and predictable focus targets. */
function useGroupManagementEffects(input) {
  const { edit, form, group } = input;

  useEffect(() => {
    form.reset(groupFormValues(group));
  }, [form, group.details, group.name, group.state]);
  useEffect(() => {
    if (edit.isSuccess) input.editSuccessRef.current?.focus();
  }, [edit.isSuccess, input.editSuccessRef]);
  useEffect(() => {
    if (edit.isError && !isGroupFieldOutcome(edit.error?.outcome)) {
      input.editErrorRef.current?.focus();
    }
  }, [edit.error?.outcome, edit.isError, input.editErrorRef]);
  useEffect(() => {
    if (input.lifecycleOutcome !== null) {
      input.lifecycleSuccessRef.current?.focus();
    }
  }, [input.lifecycleOutcome, input.lifecycleSuccessRef]);
  useEffect(() => {
    if (input.dialogAction !== null || input.postDialogFocus === null) return;

    if (input.postDialogFocus === "name") form.setFocus("name");
    if (input.postDialogFocus === "action") input.actionRef.current?.focus();
    input.setPostDialogFocus(null);
  }, [form, input]);
}

/** @returns {void} Close a Dialog and restore its invoking action focus. */
function cancelLifecycle(input) {
  input.lifecycleMutation.reset();
  input.setPostDialogFocus("action");
  input.setDialogAction(null);
}

/** @returns {void} Reset and open the lifecycle action allowed by current state. */
function openLifecycle(input) {
  const mutation = input.currentAction === "archive"
    ? input.archive
    : input.reactivate;

  mutation.reset();
  input.setLifecycleOutcome(null);
  input.setDialogAction(input.currentAction);
}

/** @returns {Function} Complete edit submission with field error ownership. */
function createEditSubmit({ edit, form, translate }) {
  return form.handleSubmit(async (values) => {
    edit.reset();
    form.clearErrors();

    try {
      const updatedGroup = await edit.mutateAsync({
        name: values.name,
        details: values.details === "" ? null : values.details,
      });

      form.reset(groupFormValues(updatedGroup));
    } catch (error) {
      applyGroupFieldOutcome({ error, form, translate });
    }
  });
}

/** @returns {Promise<void>} Accept success or return a name conflict to edit. */
async function confirmLifecycle(input) {
  try {
    const result = await input.mutation.mutateAsync();

    input.setLifecycleOutcome(result.outcome);
    input.setDialogAction(null);
  } catch (error) {
    if (input.action === "reactivate" && error.outcome === "group-name-conflict") {
      applyGroupFieldOutcome({
        error,
        form: input.form,
        shouldFocus: false,
        translate: input.translate,
      });
      input.setPostDialogFocus("name");
      input.setDialogAction(null);
    }
  }
}

/** @returns {void} Associate an authoritative Group field refusal. */
function applyGroupFieldOutcome(input) {
  const detailsByOutcome = {
    "invalid-name": ["name", "nameRequired"],
    "group-name-conflict": ["name", "nameConflict"],
    "invalid-details": ["details", "detailsInvalid"],
  };
  const details = detailsByOutcome[input.error.outcome];

  if (details === undefined) return;
  input.form.setError(details[0], {
    type: "server",
    message: input.translate(`courseStructure.group.${details[1]}`),
  });
  if (input.shouldFocus !== false) input.form.setFocus(details[0]);
}

/** @returns {boolean} Whether one Group refusal is rendered at a field. */
function isGroupFieldOutcome(outcome) {
  return new Set([
    "invalid-name",
    "invalid-details",
    "group-name-conflict",
  ]).has(outcome);
}

/** @returns {object} Complete transient Group edit values. */
function groupFormValues(group) {
  return { name: group.name, details: group.details ?? "" };
}
