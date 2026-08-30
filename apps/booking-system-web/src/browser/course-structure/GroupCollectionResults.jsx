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

/** @returns {import("react").ReactElement} Wide Course Group table. */
export function GroupTable(props) {
  return (
    <TableContainer>
      <Table aria-label={props.translate("courseStructure.group.tableLabel")}>
        <TableHead>
          <TableRow>
            <SortableHeading field="name" {...props} />
            <TableCell>{props.translate("courseStructure.group.fields.details")}</TableCell>
            <SortableHeading field="state" {...props} />
            <TableCell>{props.translate("courseStructure.group.fields.action")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell component="th" scope="row">{group.name}</TableCell>
              <TableCell sx={{ maxWidth: "24rem" }}>
                <GroupDetails group={group} translate={props.translate} />
              </TableCell>
              <TableCell><GroupState group={group} translate={props.translate} /></TableCell>
              <TableCell><GroupDetailLink group={group} {...props} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** @returns {import("react").ReactElement} Narrow Course Group cards. */
export function GroupCards(props) {
  return (
    <List aria-label={props.translate("courseStructure.group.listLabel")} disablePadding>
      {props.groups.map((group) => (
        <ListItem disablePadding key={group.id} sx={{ mb: 2 }}>
          <Card sx={{ width: "100%" }} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h2" variant="h3">{group.name}</Typography>
                <GroupDetails group={group} translate={props.translate} />
                <GroupState group={group} translate={props.translate} />
                <GroupDetailLink group={group} {...props} />
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
        {translate(`courseStructure.group.fields.${field}`)}
      </AdminCollectionSortLabel>
    </TableCell>
  );
}

/** @returns {import("react").ReactElement} Complete but visually bounded details. */
function GroupDetails({ group, translate }) {
  return (
    <Typography component="span" sx={{
      display: "-webkit-box",
      overflow: "hidden",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: 2,
    }}>
      {group.details ?? translate("courseStructure.group.noDetails")}
    </Typography>
  );
}

/** @returns {import("react").ReactElement} Explicit Group lifecycle state. */
function GroupState({ group, translate }) {
  return <Chip color={group.state === "active" ? "success" : "default"}
    label={translate(`courseStructure.state.${group.state}`)} variant="outlined" />;
}

/** @returns {import("react").ReactElement} Stable explicit detail action. */
function GroupDetailLink({ courseId, group, listPath, translate }) {
  return (
    <Button component={RouterLink}
      state={{ groupCollectionPath: listPath }}
      sx={{ alignSelf: "flex-start" }}
      to={`/admin/courses/${courseId}/groups/${group.id}`}
      variant="outlined">
      {translate("courseStructure.group.open")}
    </Button>
  );
}
