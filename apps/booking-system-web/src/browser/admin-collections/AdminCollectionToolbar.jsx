import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";

/** @returns {import("react").ReactElement} Shared applied collection controls. */
export function AdminCollectionToolbar(props) {
  const [searchDraft, setSearchDraft] = useState(props.state.q ?? "");

  useEffect(() => setSearchDraft(props.state.q ?? ""), [props.state.q]);

  return (
    <Stack spacing={2}>
      {props.searchLabel === undefined ? null : (
        <SearchControl
          action={props.labels.searchAction}
          label={props.searchLabel}
          onChange={setSearchDraft}
          onSubmit={() => props.onSearch(searchDraft)}
          value={searchDraft}
        />
      )}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        {props.filters.map((filter) => (
          <CollectionSelect
            key={filter.name}
            label={filter.label}
            onChange={(value) => props.onFilter(filter.name, value)}
            options={filter.options}
            value={props.state.filters[filter.name] ?? ""}
          />
        ))}
        <CollectionSelect
          label={props.labels.sortLabel}
          onChange={(value) => {
            const separator = value.lastIndexOf(".");

            props.onSort(
              value.slice(0, separator),
              value.slice(separator + 1),
            );
          }}
          options={props.sorts.flatMap((sort) => [
            { value: `${sort.field}.asc`, label: sort.ascendingLabel },
            { value: `${sort.field}.desc`, label: sort.descendingLabel },
          ])}
          value={`${props.state.sortField}.${props.state.sortDirection}`}
        />
        <Button
          disabled={!props.hasFilters}
          onClick={props.onReset}
          sx={{ alignSelf: { md: "center" } }}
        >
          {props.labels.resetAction}
        </Button>
      </Stack>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Explicit applied-search form. */
function SearchControl({ action, label, onChange, onSubmit, value }) {
  return (
    <Stack
      component="form"
      direction={{ xs: "column", sm: "row" }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      spacing={1.5}
    >
      <TextField
        fullWidth
        label={label}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <Button type="submit" variant="outlined">{action}</Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} One labeled allowlisted selector. */
function CollectionSelect({ label, onChange, options, value }) {
  const id = `collection-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

  return (
    <FormControl fullWidth>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        label={label}
        labelId={`${id}-label`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <MenuItem key={option.value || "all"} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
