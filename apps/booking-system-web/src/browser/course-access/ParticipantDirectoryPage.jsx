import {
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import {
  AdminCollectionResults,
  AdminCollectionSortLabel,
  AdminCollectionToolbar,
  createAdminCollectionConfiguration,
  useAdminCollectionState,
} from "../admin-collections/index.js";
import { useParticipantDirectory } from "./useCourseAccess.js";

const participantCollection = createAdminCollectionConfiguration({
  searchable: true,
  filters: { state: ["active", "disabled"] },
  sortFields: ["name", "email", "state"],
  defaultSort: "name.asc",
});

/** @returns {import("react").ReactElement} Global Participant collection route. */
export function ParticipantDirectoryPage() {
  const { t } = useTranslation();
  const collection = useAdminCollectionState(participantCollection);
  const query = useParticipantDirectory(collection.state);
  const participants = query.data?.participants ?? [];

  return (
    <Paper elevation={2} sx={{ mx: "auto", overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <Stack spacing={1}>
          <Typography component="h1" variant="h1">
            {t("courseAccess.directory.title")}
          </Typography>
          <Typography>{t("courseAccess.directory.description")}</Typography>
        </Stack>
        <AdminCollectionToolbar
          filters={participantFilters(t)}
          hasFilters={collection.hasFilters}
          labels={collectionLabels(t)}
          onFilter={collection.setFilter}
          onReset={collection.resetFilters}
          onSearch={collection.setSearch}
          onSort={collection.setSort}
          searchLabel={t("courseAccess.directory.search")}
          sorts={participantSorts(t)}
          state={collection.state}
        />
        <AdminCollectionResults
          errorMessage={(error) => courseAccessErrorMessage(error, t)}
          hasFilters={collection.hasFilters}
          items={participants}
          messages={resultMessages(t)}
          onPage={collection.setPage}
          onPageSize={collection.setPageSize}
          onReset={collection.resetFilters}
          query={query}
          renderDesktop={() => (
            <ParticipantTable
              collection={collection}
              participants={participants}
              translate={t}
            />
          )}
          renderMobile={() => (
            <ParticipantCards participants={participants} translate={t} />
          )}
          state={collection.state}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Wide semantic Participant table. */
function ParticipantTable({ collection, participants, translate }) {
  const heading = (field) => (
    <AdminCollectionSortLabel
      field={field}
      onSort={collection.toggleSort}
      state={collection.state}
    >
      {translate(`courseAccess.directory.fields.${field}`)}
    </AdminCollectionSortLabel>
  );

  return (
    <TableContainer>
      <Table aria-label={translate("courseAccess.directory.tableLabel")}>
        <TableHead>
          <TableRow>
            <TableCell sortDirection={sortDirection(collection, "name")}>{heading("name")}</TableCell>
            <TableCell sortDirection={sortDirection(collection, "email")}>{heading("email")}</TableCell>
            <TableCell sortDirection={sortDirection(collection, "state")}>{heading("state")}</TableCell>
            <TableCell>{translate("courseAccess.directory.fields.action")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id}>
              <TableCell component="th" scope="row">{participant.name}</TableCell>
              <TableCell>{participant.email}</TableCell>
              <TableCell>
                <ParticipantStateChip participant={participant} translate={translate} />
              </TableCell>
              <TableCell><ParticipantLink participant={participant} translate={translate} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow named Participant card list. */
function ParticipantCards({ participants, translate }) {
  return (
    <List aria-label={translate("courseAccess.directory.listLabel")} disablePadding>
      {participants.map((participant) => (
        <ListItem disablePadding key={participant.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h2">{participant.name}</Typography>
                <Typography>{participant.email}</Typography>
                <ParticipantStateChip participant={participant} translate={translate} />
                <ParticipantLink participant={participant} translate={translate} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} Textual global Participant state. */
function ParticipantStateChip({ participant, translate }) {
  const isActive = participant.state === "active";

  return (
    <Chip
      color={isActive ? "success" : "default"}
      label={translate(`courseAccess.participantState.${participant.state}`)}
      sx={{ alignSelf: "flex-start" }}
      variant={isActive ? "filled" : "outlined"}
    />
  );
}

/** @returns {import("react").ReactElement} Explicit Participant detail action. */
function ParticipantLink({ participant, translate }) {
  return (
    <Button
      component={RouterLink}
      to={`/admin/participants/${participant.id}`}
      variant="outlined"
    >
      {translate("courseAccess.profile.adminNavigation")}
    </Button>
  );
}

/** @returns {Array<object>} Localized Participant filters. */
function participantFilters(translate) {
  return [{
    name: "state",
    label: translate("courseAccess.directory.filters.state"),
    options: [
      { value: "", label: translate("adminCollections.all") },
      { value: "active", label: translate("courseAccess.participantState.active") },
      { value: "disabled", label: translate("courseAccess.participantState.disabled") },
    ],
  }];
}

/** @returns {Array<object>} Localized Participant sort choices. */
function participantSorts(translate) {
  return ["name", "email", "state"].map((field) => ({
    field,
    ascendingLabel: translate("adminCollections.ascending", {
      field: translate(`courseAccess.directory.fields.${field}`),
    }),
    descendingLabel: translate("adminCollections.descending", {
      field: translate(`courseAccess.directory.fields.${field}`),
    }),
  }));
}

/** @returns {object} Shared localized control labels. */
function collectionLabels(translate) {
  return {
    searchAction: translate("adminCollections.searchAction"),
    resetAction: translate("adminCollections.resetAction"),
    sortLabel: translate("adminCollections.sortLabel"),
  };
}

/** @returns {object} Localized Participant result messages. */
function resultMessages(translate) {
  return {
    loading: translate("courseAccess.directory.loading"),
    empty: translate("courseAccess.directory.empty"),
    filteredEmpty: translate("adminCollections.filteredEmpty"),
    pageEmpty: translate("adminCollections.pageEmpty"),
    reset: translate("adminCollections.resetAction"),
    rowsPerPage: translate("adminCollections.pagination.rowsPerPage"),
    of: translate("adminCollections.pagination.of"),
    first: translate("adminCollections.pagination.first"),
    last: translate("adminCollections.pagination.last"),
    next: translate("adminCollections.pagination.next"),
    previous: translate("adminCollections.pagination.previous"),
  };
}

/** @returns {string} Localized Participant collection failure. */
function courseAccessErrorMessage(error, translate) {
  const unavailable = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
  ]);

  return unavailable.has(error?.outcome)
    ? translate("courseAccess.status.unavailable")
    : translate("courseAccess.status.technicalError");
}

/** @returns {"asc" | "desc" | false} Accessible active sort direction. */
function sortDirection(collection, field) {
  return collection.state.sortField === field
    ? collection.state.sortDirection
    : false;
}
