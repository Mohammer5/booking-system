import { useEffect, useRef, useState } from "react";

import { useCancelModule } from "./useCourses.js";

/** @returns {object} Module cancellation mutation, Dialog, and focus state. */
export function useModuleCancellation(courseId, moduleId) {
  const cancellation = useCancelModule(courseId, moduleId);
  const [isOpen, setIsOpen] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [shouldRestoreFocus, setShouldRestoreFocus] = useState(false);
  const actionRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (!isOpen && shouldRestoreFocus) {
      actionRef.current?.focus();
      setShouldRestoreFocus(false);
    }
  }, [isOpen, shouldRestoreFocus]);
  useEffect(() => {
    if (outcome === "cancelled") successRef.current?.focus();
  }, [outcome]);

  return {
    actionRef,
    cancel: () => {
      cancellation.reset();
      setShouldRestoreFocus(true);
      setIsOpen(false);
    },
    cancellation,
    confirm: async () => {
      try {
        await cancellation.mutateAsync();
        setOutcome("cancelled");
        setIsOpen(false);
      } catch {
        // The open Dialog owns and focuses the mutation error.
      }
    },
    isOpen,
    open: () => {
      cancellation.reset();
      setOutcome(null);
      setIsOpen(true);
    },
    outcome,
    successRef,
  };
}
