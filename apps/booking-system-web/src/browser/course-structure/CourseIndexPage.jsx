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
import { useCourseIndex } from "./useCourses.js";

const courseCollection = createAdminCollectionConfiguration({
  searchable: true,
  filters: { state: ["active", "archived"] },
  sortFields: ["name", "state", "timezone"],
  defaultSort: "name.asc",
});

/** @returns {import("react").ReactElement} URL-owned Course collection route. */
export function CourseIndexPage() {
  const { t } = useTranslation();
  const collection = useAdminCollectionState(courseCollection);
  const query = useCourseIndex(collection.state);
  const courses = query.data?.courses ?? [];

  return (
    <Paper elevation={2} sx={{ mx: "auto", overflowWrap: "anywhere", p: { xs: 3, sm: 5 } }}>
      <Stack component="section" spacing={3}>
        <CourseHeading translate={t} />
        <AdminCollectionToolbar
          filters={courseFilters(t)}
          hasFilters={collection.hasFilters}
          labels={collectionLabels(t)}
          onFilter={collection.setFilter}
          onReset={collection.resetFilters}
          onSearch={collection.setSearch}
          onSort={collection.setSort}
          searchLabel={t("courseStructure.index.search")}
          sorts={courseSorts(t)}
          state={collection.state}
        />
        <AdminCollectionResults
          errorMessage={(error) => courseErrorMessage(error, t)}
          hasFilters={collection.hasFilters}
          items={courses}
          messages={resultMessages(t)}
          onPage={collection.setPage}
          onPageSize={collection.setPageSize}
          onReset={collection.resetFilters}
          query={query}
          renderDesktop={() => (
            <CourseTable collection={collection} courses={courses} translate={t} />
          )}
          renderMobile={() => <CourseCards courses={courses} translate={t} />}
          state={collection.state}
        />
      </Stack>
    </Paper>
  );
}

/** @returns {import("react").ReactElement} Heading and Course creation action. */
function CourseHeading({ translate }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
      <Stack spacing={1}>
        <Typography component="h1" variant="h1">
          {translate("courseStructure.index.title")}
        </Typography>
        <Typography>{translate("courseStructure.index.description")}</Typography>
      </Stack>
      <Button component={RouterLink} to="/admin/courses/new" variant="contained">
        {translate("courseStructure.index.create")}
      </Button>
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Wide semantic Course table. */
function CourseTable({ collection, courses, translate }) {
  const heading = (field, key) => (
    <AdminCollectionSortLabel
      field={field}
      onSort={collection.toggleSort}
      state={collection.state}
    >
      {translate(key)}
    </AdminCollectionSortLabel>
  );

  return (
    <TableContainer>
      <Table aria-label={translate("courseStructure.index.tableLabel")}>
        <TableHead>
          <TableRow>
            <TableCell sortDirection={sortDirection(collection, "name")}>{heading("name", "courseStructure.index.fields.name")}</TableCell>
            <TableCell sortDirection={sortDirection(collection, "state")}>{heading("state", "courseStructure.index.fields.state")}</TableCell>
            <TableCell sortDirection={sortDirection(collection, "timezone")}>{heading("timezone", "courseStructure.index.fields.timezone")}</TableCell>
            <TableCell>{translate("courseStructure.index.fields.action")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell component="th" scope="row">{course.name}</TableCell>
              <TableCell><CourseStateChip course={course} translate={translate} /></TableCell>
              <TableCell>{course.timezone}</TableCell>
              <TableCell><CourseLink course={course} translate={translate} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow named Course card list. */
function CourseCards({ courses, translate }) {
  return (
    <List aria-label={translate("courseStructure.index.listLabel")} disablePadding>
      {courses.map((course) => (
        <ListItem disablePadding key={course.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h2">{course.name}</Typography>
                <CourseStateChip course={course} translate={translate} />
                <Typography>{course.timezone}</Typography>
                <CourseLink course={course} translate={translate} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} Textual Course lifecycle state. */
function CourseStateChip({ course, translate }) {
  return (
    <Chip
      color={course.state === "active" ? "success" : "default"}
      label={translate(`courseStructure.state.${course.state}`)}
      sx={{ alignSelf: "flex-start" }}
      variant={course.state === "active" ? "filled" : "outlined"}
    />
  );
}

/** @returns {import("react").ReactElement} Explicit Course detail action. */
function CourseLink({ course, translate }) {
  return (
    <Button component={RouterLink} to={`/admin/courses/${course.id}`} variant="outlined">
      {translate("courseStructure.index.open")}
    </Button>
  );
}

/** @returns {Array<object>} Localized Course filters. */
function courseFilters(translate) {
  return [{
    name: "state",
    label: translate("courseStructure.index.filters.state"),
    options: [
      { value: "", label: translate("adminCollections.all") },
      { value: "active", label: translate("courseStructure.state.active") },
      { value: "archived", label: translate("courseStructure.state.archived") },
    ],
  }];
}

/** @returns {Array<object>} Localized Course sort choices. */
function courseSorts(translate) {
  return ["name", "state", "timezone"].map((field) => ({
    field,
    ascendingLabel: translate("adminCollections.ascending", {
      field: translate(`courseStructure.index.fields.${field}`),
    }),
    descendingLabel: translate("adminCollections.descending", {
      field: translate(`courseStructure.index.fields.${field}`),
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

/** @returns {object} Localized Course result messages. */
function resultMessages(translate) {
  return {
    loading: translate("courseStructure.index.loading"),
    empty: translate("courseStructure.index.empty"),
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

/** @returns {string} Localized Course query failure. */
function courseErrorMessage(error, translate) {
  const unavailable = new Set([
    "unauthenticated",
    "no-admin-user",
    "disabled-admin",
    "admin-not-active",
  ]);

  return unavailable.has(error?.outcome)
    ? translate("courseStructure.status.unavailable")
    : translate("courseStructure.status.technicalError");
}

/** @returns {"asc" | "desc" | false} Accessible active sort direction. */
function sortDirection(collection, field) {
  return collection.state.sortField === field
    ? collection.state.sortDirection
    : false;
}
