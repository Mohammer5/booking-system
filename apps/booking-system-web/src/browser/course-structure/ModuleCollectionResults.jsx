import {
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router";

import { AdminCollectionSortLabel } from "../admin-collections/index.js";
import { InstantValue } from "./ModuleSchedule.jsx";

/** @returns {import("react").ReactElement} Wide Course Module table. */
export function ModuleTable(props) {
  return (
    <TableContainer>
      <Table aria-label={props.translate("courseStructure.module.tableLabel")}>
        <TableHead>
          <TableRow>
            <SortableHeading field="title" {...props} />
            <SortableHeading field="startsAt" {...props} />
            <TableCell>{props.translate("courseStructure.module.fields.endsAt")}</TableCell>
            <SortableHeading field="state" {...props} />
            <TableCell>{props.translate("courseStructure.module.fields.action")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.modules.map((module) => (
            <TableRow key={module.id}>
              <TableCell component="th" scope="row">{module.title}</TableCell>
              <TableCell><ModuleInstant instant={module.startsAt} {...props} /></TableCell>
              <TableCell><ModuleInstant instant={module.endsAt} {...props} /></TableCell>
              <TableCell><ModuleState module={module} {...props} /></TableCell>
              <TableCell><ModuleDetailLink module={module} {...props} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow Course Module cards. */
export function ModuleCards(props) {
  return (
    <List aria-label={props.translate("courseStructure.module.listLabel")} disablePadding>
      {props.modules.map((module) => (
        <ListItem disablePadding key={module.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h3">{module.title}</Typography>
                <ModuleCardInstant field="startsAt" module={module} {...props} />
                <ModuleCardInstant field="endsAt" module={module} {...props} />
                <ModuleState module={module} {...props} />
                <ModuleDetailLink module={module} {...props} />
              </Stack>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

/** @returns {import("react").ReactElement} One sortable table heading. */
function SortableHeading({ collection, field, translate }) {
  return (
    <TableCell sortDirection={collection.state.sortField === field
      ? collection.state.sortDirection
      : false}>
      <AdminCollectionSortLabel field={field}
        onSort={collection.toggleSort} state={collection.state}>
        {translate(`courseStructure.module.fields.${field}`)}
      </AdminCollectionSortLabel>
    </TableCell>
  );
}

/** @returns {import("react").ReactElement} Labelled time on a narrow card. */
function ModuleCardInstant({ field, module, timezone, translate }) {
  return (
    <Stack spacing={0.5}>
      <Typography component="span" fontWeight={700}>
        {translate(`courseStructure.module.fields.${field}`)}
      </Typography>
      <ModuleInstant instant={module[field]} timezone={timezone} />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} Course-local semantic instant. */
function ModuleInstant({ instant, timezone }) {
  return <InstantValue instant={instant} timezone={timezone} />;
}

/** @returns {import("react").ReactElement} Explicit Module lifecycle state. */
function ModuleState({ module, translate }) {
  return <Chip color={module.state === "scheduled" ? "success" : "default"}
    label={translate(`courseStructure.module.state.${module.state}`)}
    sx={{ alignSelf: "flex-start" }} variant="outlined" />;
}

/** @returns {import("react").ReactElement} Stable explicit detail action. */
function ModuleDetailLink({ courseId, listPath, module, translate }) {
  return (
    <Button component={RouterLink}
      state={{ moduleCollectionPath: listPath }}
      sx={{ alignSelf: "flex-start" }}
      to={`/admin/courses/${courseId}/modules/${module.id}`}
      variant="outlined">
      {translate("courseStructure.module.open")}
    </Button>
  );
}
