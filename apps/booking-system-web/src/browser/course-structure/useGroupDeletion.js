import { useEffect, useRef, useState } from "react";

import { useDeleteGroup } from "./useCourses.js";

/** @returns {object} Group deletion mutation, Dialog, and focus state. */
export function useGroupDeletion(courseId, group, onDeleted) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRestoreFocus, setShouldRestoreFocus] = useState(false);
  const actionRef = useRef(null);
  const mutation = useDeleteGroup(courseId, group.id, onDeleted);

  useEffect(() => {
    if (!isOpen && shouldRestoreFocus) {
      actionRef.current?.focus();
      setShouldRestoreFocus(false);
    }
  }, [isOpen, shouldRestoreFocus]);

  return {
    actionRef,
    cancel: () => {
      mutation.reset();
      setShouldRestoreFocus(true);
      setIsOpen(false);
    },
    confirm: () => mutation.mutate(),
    isOpen,
    mutation,
    open: () => {
      mutation.reset();
      setIsOpen(true);
    },
  };
}
