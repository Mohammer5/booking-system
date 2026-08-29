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

import { usePromoteAdminUser } from "./useAdminUsers.js";

/**
 * Present one eligible permanent Admin User promotion.
 *
 * @param {object} props Current Admin User and translation function.
 * @returns {import("react").ReactElement | null} Promotion action and result.
 */
export function AdminUserPromotionControl({ adminUser, translate }) {
  const mutation = usePromoteAdminUser(adminUser.id);
  const openerRef = useRef(null);
  const successRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (mutation.isSuccess && isOpen) setIsOpen(false);
  }, [isOpen, mutation.isSuccess]);

  useEffect(() => {
    if (mutation.isSuccess && !isOpen) successRef.current?.focus();
    if (!isOpen && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      openerRef.current?.focus();
    }
  }, [isOpen, mutation.isSuccess]);

  const close = () => {
    restoreFocusRef.current = true;
    setIsOpen(false);
  };

  if (!adminUser.isPromotionAvailable && !mutation.isSuccess && !isOpen) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      {mutation.isSuccess ? (
        <Alert ref={successRef} role="status" severity="success" tabIndex={-1}>
          {translate("adminUsers.promotion.success", { name: adminUser.name })}
        </Alert>
      ) : null}
      {adminUser.isPromotionAvailable && !mutation.isSuccess ? (
        <Button
          aria-haspopup="dialog"
          onClick={() => {
            mutation.reset();
            setIsOpen(true);
          }}
          ref={openerRef}
          sx={{ alignSelf: "flex-start" }}
          variant="outlined"
        >
          {translate("adminUsers.promotion.action")}
        </Button>
      ) : null}
      {isOpen ? (
        <AdminUserPromotionDialog
          adminUser={adminUser}
          mutation={mutation}
          onCancel={close}
          translate={translate}
        />
      ) : null}
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Permanent promotion confirmation. */
function AdminUserPromotionDialog(props) {
  const cancelRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (props.mutation.isError) errorRef.current?.focus();
  }, [props.mutation.isError]);

  return (
    <Dialog
      aria-describedby={`admin-${props.adminUser.id}-promotion-description`}
      aria-labelledby={`admin-${props.adminUser.id}-promotion-title`}
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
      <AdminUserPromotionDialogContent errorRef={errorRef} {...props} />
      <AdminUserPromotionDialogActions cancelRef={cancelRef} {...props} />
    </Dialog>
  );
}

/** @returns {import("react").ReactElement} Promotion copy and refusal. */
function AdminUserPromotionDialogContent(props) {
  return (
    <>
      <DialogTitle id={`admin-${props.adminUser.id}-promotion-title`}>
        {props.translate("adminUsers.promotion.title")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText
            id={`admin-${props.adminUser.id}-promotion-description`}
          >
            {props.translate("adminUsers.promotion.description")}
          </DialogContentText>
          <Typography fontWeight={700}>{props.adminUser.name}</Typography>
          {props.mutation.isError ? (
            <Alert ref={props.errorRef} severity="error" tabIndex={-1}>
              {props.translate(promotionErrorKey(props.mutation.error))}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
    </>
  );
}

/** @returns {import("react").ReactElement} Promotion cancel and submit. */
function AdminUserPromotionDialogActions(props) {
  return (
    <DialogActions>
      <Button
        disabled={props.mutation.isPending}
        onClick={props.onCancel}
        ref={props.cancelRef}
      >
        {props.translate("adminUsers.promotion.cancel")}
      </Button>
      <Button
        disabled={props.mutation.isPending}
        onClick={() => props.mutation.mutate()}
        variant="contained"
      >
        {props.translate(props.mutation.isPending
          ? "adminUsers.promotion.pending"
          : "adminUsers.promotion.confirm")}
      </Button>
    </DialogActions>
  );
}

/** @returns {string} Safe stale or technical promotion message key. */
function promotionErrorKey(error) {
  return error?.outcome === "technical-error"
    ? "adminUsers.status.technicalError"
    : "adminUsers.promotion.unavailable";
}
