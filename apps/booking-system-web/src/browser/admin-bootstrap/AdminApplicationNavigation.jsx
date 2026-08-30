import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";

const resourceItems = [
  {
    labelKey: "adminAccess.navigation.courses",
    path: "/admin/courses",
    resource: "courses",
  },
  {
    labelKey: "adminAccess.navigation.participants",
    path: "/admin/participants",
    resource: "participants",
  },
  {
    labelKey: "adminAccess.navigation.adminUsers",
    path: "/admin/users",
    resource: "users",
  },
  {
    labelKey: "adminAccess.navigation.adminInvites",
    path: "/admin/invites",
    resource: "invites",
  },
];

/**
 * Present Active-Admin resource navigation and separate account controls.
 *
 * @param {object} props Presentation properties.
 * @param {object} props.admin The authoritative current Admin User.
 * @param {(() => void) | undefined} props.onNavigate Close a transient parent.
 * @returns {import("react").ReactElement} The Admin navigation surface.
 */
export function AdminApplicationNavigation({
  admin,
  onNavigate,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const currentResource = resolveCurrentResource(location.pathname);
  const authority = t(`adminAccess.context.${admin.authority === "super-admin"
    ? "superAdmin"
    : "admin"}`);

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <ResourceNavigation
        currentResource={currentResource}
        onNavigate={onNavigate}
        translate={t}
      />
      <Divider />
      <AdminAccountControls
        admin={admin}
        authority={authority}
        onNavigate={onNavigate}
        translate={t}
      />
    </Stack>
  );
}

/** @returns {import("react").ReactElement} The four resource destinations. */
function ResourceNavigation({ currentResource, onNavigate, translate }) {
  return (
    <Box aria-label={translate("adminAccess.navigation.label")} component="nav">
      <Typography component="h2" variant="h2">
        {translate("adminAccess.navigation.title")}
      </Typography>
      <List disablePadding sx={{ mt: 2 }}>
        {resourceItems.map((item) => (
          <ResourceNavigationItem
            currentResource={currentResource}
            item={item}
            key={item.resource}
            onNavigate={onNavigate}
            translate={translate}
          />
        ))}
      </List>
    </Box>
  );
}

/** @returns {import("react").ReactElement} One selected-aware resource link. */
function ResourceNavigationItem(props) {
  const isCurrent = props.currentResource === props.item.resource;

  return (
    <ListItem disablePadding>
      <ListItemButton
        aria-current={isCurrent ? "page" : undefined}
        component={RouterLink}
        onClick={props.onNavigate}
        selected={isCurrent}
        sx={{ borderRadius: 1 }}
        to={props.item.path}
      >
        <ListItemText primary={props.translate(props.item.labelKey)} />
      </ListItemButton>
    </ListItem>
  );
}

/** @returns {import("react").ReactElement} Identity and non-resource actions. */
function AdminAccountControls(props) {
  return (
    <Stack spacing={1.5} sx={{ overflowWrap: "anywhere" }}>
      <Typography component="p" fontWeight={700}>{props.admin.name}</Typography>
      <Chip
        label={props.authority}
        size="small"
        sx={{ alignSelf: "flex-start" }}
        variant="outlined"
      />
      <Button
        component={RouterLink}
        onClick={props.onNavigate}
        sx={{ alignSelf: "flex-start" }}
        to={`/admin/users/${props.admin.id}`}
        variant="text"
      >
        {props.translate("adminAccess.navigation.ownAccount")}
      </Button>
    </Stack>
  );
}

/**
 * Resolve top-level resource ownership for collection and nested routes.
 *
 * @param {string} pathname The current language-independent pathname.
 * @returns {string | null} The selected resource key.
 */
export function resolveCurrentResource(pathname) {
  const resource = resourceItems.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  return resource?.resource ?? null;
}
