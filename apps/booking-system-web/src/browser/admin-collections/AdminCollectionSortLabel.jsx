import { TableSortLabel } from "@mui/material";

/** @returns {import("react").ReactElement} One accessible sortable heading. */
export function AdminCollectionSortLabel({ children, field, onSort, state }) {
  const active = state.sortField === field;

  return (
    <TableSortLabel
      active={active}
      direction={active ? state.sortDirection : "asc"}
      onClick={() => onSort(field)}
    >
      {children}
    </TableSortLabel>
  );
}
