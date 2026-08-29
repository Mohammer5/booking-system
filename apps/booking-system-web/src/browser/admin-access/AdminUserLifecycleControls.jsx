import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { useChangeAdminUserLifecycle } from "./useAdminUsers.js";

/** @returns {import("react").ReactElement | null} Permitted lifecycle commands. */
export function AdminUserLifecycleControls({
  adminUser,
  onDeleted,
  showRestriction = false,
  translate,
}) {
  const control = useLifecycleControl(adminUser, onDeleted);
  const availableActions = lifecycleActions(adminUser);
  const restriction = showRestriction
    ? lifecycleRestrictionKey(adminUser.lifecycleRestriction)
    : null;

  if (
    availableActions.length === 0 &&
    control.successAction === null &&
    control.action === null &&
    restriction === null
  ) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <LifecycleStatus
        adminUser={adminUser}
        control={control}
        restriction={restriction}
        translate={translate}
      />
      <LifecycleActionButtons
        actions={availableActions}
        onOpen={control.open}
        translate={translate}
      />
      {control.action !== null ? (
        <AdminUserLifecycleDialog
          action={control.action}
          adminUser={adminUser}
          mutation={control.mutation}
          onCancel={control.cancel}
          onConfirm={control.confirm}
          translate={translate}
        />
      ) : null}
    </Stack>
  );
}

/** @returns {object} Local dialog, focus, and mutation state. */
function useLifecycleControl(adminUser, onDeleted) {
  const mutation = useChangeAdminUserLifecycle(adminUser.id);
  const openerRef = useRef(null);
  const successRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const [action, setAction] = useState(null);
  const [successAction, setSuccessAction] = useState(null);

  useEffect(() => {
    if (successAction !== null && action === null) successRef.current?.focus();
    if (action === null && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      openerRef.current?.focus();
    }
  }, [action, successAction]);

  const open = (nextAction, opener) => {
    openerRef.current = opener;
    mutation.reset();
    setSuccessAction(null);
    setAction(nextAction);
  };
  const cancel = () => {
    restoreFocusRef.current = true;
    setAction(null);
  };
  const confirm = () => mutation.mutate({ action }, {
    onSuccess: (result) => {
      setAction(null);
      if (action === "delete") {
        onDeleted?.({ id: result.adminUserId, name: adminUser.name });
      } else {
        setSuccessAction(action);
      }
    },
  });

  return {
    action,
    cancel,
    confirm,
    mutation,
    open,
    successAction,
    successRef,
  };
}

/** @returns {import("react").ReactElement} Restriction and completion status. */
function LifecycleStatus({ adminUser, control, restriction, translate }) {
  return (
    <>
      {restriction !== null ? (
        <Alert severity="info">{translate(restriction)}</Alert>
      ) : null}
      {control.successAction !== null ? (
        <Alert
          ref={control.successRef}
          role="status"
          severity="success"
          tabIndex={-1}
        >
          {translate(`adminUsers.lifecycle.success.${control.successAction}`, {
            name: adminUser.name,
          })}
        </Alert>
      ) : null}
    </>
  );
}

/** @returns {import("react").ReactElement | null} Permitted action buttons. */
function LifecycleActionButtons({ actions, onOpen, translate }) {
  return actions.length === 0 ? null : (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      {actions.map((action) => (
        <Button
          aria-haspopup="dialog"
          color={action === "delete" ? "error" : "primary"}
          key={action}
          onClick={(event) => onOpen(action, event.currentTarget)}
          sx={{ alignSelf: "flex-start" }}
          variant="outlined"
        >
          {translate(`adminUsers.lifecycle.${action}.action`)}
        </Button>
      ))}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One lifecycle confirmation. */
function AdminUserLifecycleDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (props.mutation.isError) errorRef.current?.focus();
  }, [props.mutation.isError]);

  const id = `admin-${props.adminUser.id}-${props.action}`;

  return (
    <Dialog
      aria-describedby={`${id}-description`}
      aria-labelledby={`${id}-title`}
      disableAutoFocus
      disableRestoreFocus
      fullWidth
      maxWidth="sm"
      onClose={props.mutation.isPending ? undefined : props.onCancel}
      open
      slotProps={{
        transition: {
          onEntered: () => cancelRef.current?.focus(),
          style: { opacity: 1 },
        },
      }}
      transitionDuration={0}
    >
      <AdminUserLifecycleDialogContent errorRef={errorRef} id={id} {...props} />
      <AdminUserLifecycleDialogActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Consequences and refusal. */
function AdminUserLifecycleDialogContent(props) {
  return (
    <>
      <DialogTitle id={`${props.id}-title`}>
        {props.translate(`adminUsers.lifecycle.${props.action}.title`)}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id={`${props.id}-description`}>
            {props.translate(`adminUsers.lifecycle.${props.action}.description`)}
          </DialogContentText>
          <Typography fontWeight={700}>{props.adminUser.name}</Typography>
          {props.mutation.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {props.translate(lifecycleErrorKey(props.mutation.error))}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
    </>
  );
}

/** @returns {import("react").ReactElement} Cancel and confirm controls. */
function AdminUserLifecycleDialogActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
      >
        {props.translate("adminUsers.lifecycle.cancel")}
      </Button>
      <Button
        color={props.action === "delete" ? "error" : "primary"}
        disabled={props.mutation.isPending}
        onClick={props.onConfirm}
        variant="contained"
      >
        {props.translate(props.mutation.isPending
          ? `adminUsers.lifecycle.${props.action}.pending`
          : `adminUsers.lifecycle.${props.action}.confirm`)}
      </Button>
    </DialogActions>
  );
}

/** @returns {Array<string>} Server-authorized actions in stable order. */
function lifecycleActions(adminUser) {
  return [
    ["disable", adminUser.isDisableAvailable],
    ["reenable", adminUser.isReenableAvailable],
    ["delete", adminUser.isDeleteAvailable],
  ].filter(([, isAvailable]) => isAvailable).map(([action]) => action);
}

/** @returns {string | null} Stable read-only presentation key. */
function lifecycleRestrictionKey(restriction) {
  const keys = {
    "self-protected": "adminUsers.lifecycle.restrictions.selfProtected",
    "super-admin-protected":
      "adminUsers.lifecycle.restrictions.superAdminProtected",
  };

  return keys[restriction] ?? null;
}

/** @returns {string} Safe stale, invariant, or technical message key. */
function lifecycleErrorKey(error) {
  const keys = {
    "admin-user-last-active-super":
      "adminUsers.lifecycle.errors.lastActiveSuper",
    "admin-user-self-protected":
      "adminUsers.lifecycle.errors.selfProtected",
    "admin-user-not-manageable":
      "adminUsers.lifecycle.errors.superAdminProtected",
    "technical-error": "adminUsers.status.technicalError",
  };

  return keys[error?.outcome] ?? "adminUsers.lifecycle.errors.stale";
}
