import { useEffect, useRef, useState } from "react";

import { useDeleteModule } from "./useCourses.js";

/** @returns {object} Module deletion mutation, Dialog, and focus state. */
export function useModuleDeletion(courseId, module, onDeleted) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRestoreFocus, setShouldRestoreFocus] = useState(false);
  const actionRef = useRef(null);
  const mutation = useDeleteModule(courseId, module.id, onDeleted);

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
