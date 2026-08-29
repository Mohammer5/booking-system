import { useEffect, useRef, useState } from "react";

import { useArchiveCourse } from "./useCourses.js";

/** @returns {object} Course archival mutation, Dialog, and focus state. */
export function useCourseArchival(course, onArchived) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRestoreFocus, setShouldRestoreFocus] = useState(false);
  const actionRef = useRef(null);
  const mutation = useArchiveCourse(course.id, onArchived);

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
