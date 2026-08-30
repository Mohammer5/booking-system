import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TablePagination,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useEffect, useRef } from "react";

/** @returns {import("react").ReactElement | null} Shared collection result states. */
export function AdminCollectionResults(props) {
  const errorRef = useRef(null);
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("md"));

  useEffect(() => {
    if (props.query.isError) errorRef.current?.focus();
  }, [props.query.isError]);

  if (props.query.isPending) {
    return <PendingCollection message={props.messages.loading} />;
  }

  if (props.query.isError) {
    return (
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {props.errorMessage(props.query.error)}
      </Alert>
    );
  }

  if (props.query.data.pagination.totalItems === 0) {
    return props.hasFilters ? (
      <Alert
        action={<Button onClick={props.onReset}>{props.messages.reset}</Button>}
        role="status"
        severity="info"
      >
        {props.messages.filteredEmpty}
      </Alert>
    ) : <Alert role="status" severity="info">{props.messages.empty}</Alert>;
  }

  const content = props.items.length === 0 ? (
    <Alert role="status" severity="info">{props.messages.pageEmpty}</Alert>
  ) : isDesktop ? props.renderDesktop() : props.renderMobile();

  return (
    <Stack spacing={2}>
      {content}
      <TablePagination
        component="div"
        count={props.query.data.pagination.totalItems}
        getItemAriaLabel={(type) => props.messages[type]}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} ${props.messages.of} ${count}`}
        labelRowsPerPage={props.messages.rowsPerPage}
        onPageChange={(_event, page) => props.onPage(page + 1)}
        onRowsPerPageChange={(event) => props.onPageSize(Number(event.target.value))}
        page={props.state.page - 1}
        rowsPerPage={props.state.pageSize}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One polite collection loading state. */
function PendingCollection({ message }) {
  return (
    <Stack aria-live="polite" role="status" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress aria-hidden="true" size={36} />
      <Typography>{message}</Typography>
    </Stack>
  );
}
