import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";

const contexts = {
  participant: {
    documentTitleKey: "applicationShell.participant.documentTitle",
    titleKey: "applicationShell.participant.title",
  },
  admin: {
    documentTitleKey: "applicationShell.admin.documentTitle",
    titleKey: "applicationShell.admin.title",
  },
};

const navigationItems = [
  {
    context: "participant",
    labelKey: "applicationShell.navigation.participant",
    path: "/",
  },
  {
    context: "admin",
    labelKey: "applicationShell.navigation.admin",
    path: "/admin",
  },
];

/**
 * Present the responsive frame shared by the two concrete browser contexts.
 *
 * @param {object} props Component properties.
 * @param {import("react").ReactNode} props.children Route-owned content.
 * @param {"participant" | "admin"} props.context Current application context.
 * @returns {import("react").ReactElement} The application frame.
 */
export function ResponsiveApplicationShell({ children, context }) {
  const { t } = useTranslation();
  const contextConfiguration = contexts[context];

  useEffect(() => {
    document.title = t(contextConfiguration.documentTitleKey);
  }, [contextConfiguration.documentTitleKey, t]);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        component="a"
        href="#main-content"
        sx={skipLinkStyles}
      >
        {t("applicationShell.skipToContent")}
      </Box>
      <ApplicationHeader
        contextTitle={t(contextConfiguration.titleKey)}
        translate={t}
      />
      <Container
        component="main"
        id="main-content"
        maxWidth="lg"
        tabIndex={-1}
        sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 } }}
      >
        {children}
      </Container>
    </Box>
  );
}

/**
 * Present the responsive banner and its transient mobile navigation.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The application banner.
 */
function ApplicationHeader({ contextTitle, translate }) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const closeNavigation = () => setIsNavigationOpen(false);

  return (
    <AppBar component="header" position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="p" fontWeight={700} variant="h6">
            {translate("applicationShell.productName")}
          </Typography>
          <Typography component="p" variant="body2">
            {contextTitle}
          </Typography>
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <ApplicationNavigation translate={translate} />
        </Box>
        <Button
          aria-haspopup="dialog"
          aria-expanded={isNavigationOpen}
          color="inherit"
          onClick={() => setIsNavigationOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" } }}
          variant="outlined"
        >
          {translate("applicationShell.navigation.open")}
        </Button>
      </Toolbar>
      <Drawer
        anchor="right"
        open={isNavigationOpen}
        onClose={closeNavigation}
      >
        <Box sx={{ p: 2, width: "min(82vw, 20rem)" }}>
          <Button
            ref={focusCloseNavigationControl}
            onClick={closeNavigation}
            variant="outlined"
          >
            {translate("applicationShell.navigation.close")}
          </Button>
          <Typography component="h2" sx={{ mt: 3 }} variant="h2">
            {translate("applicationShell.navigation.title")}
          </Typography>
          <ApplicationNavigation
            onNavigate={closeNavigation}
            translate={translate}
          />
        </Box>
      </Drawer>
    </AppBar>
  );
}

/**
 * Present one localized, current-route-aware navigation list.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The primary navigation.
 */
function ApplicationNavigation({ onNavigate, translate }) {
  const location = useLocation();

  return (
    <Box
      aria-label={translate("applicationShell.navigation.label")}
      component="nav"
    >
      <List sx={{ display: { md: "flex" }, gap: 0.5, py: 1 }}>
        {navigationItems.map((item) => {
          const isCurrent = currentContext(location.pathname) === item.context;

          return (
            <ListItem disablePadding key={item.context}>
              <ListItemButton
                aria-current={isCurrent ? "page" : undefined}
                component={RouterLink}
                onClick={onNavigate}
                selected={isCurrent}
                sx={{ borderRadius: 1, whiteSpace: "nowrap" }}
                to={item.path}
              >
                <ListItemText primary={translate(item.labelKey)} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

/**
 * Resolve only the two route contexts without creating authentication state.
 *
 * @param {string} pathname Current language-independent pathname.
 * @returns {"participant" | "admin"} Current browser context.
 */
function currentContext(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "admin"
    : "participant";
}

/**
 * Focus the first safe Drawer action when its portal content mounts.
 *
 * @param {HTMLButtonElement | null} node The mounted close control.
 * @returns {void}
 */
function focusCloseNavigationControl(node) {
  node?.focus();
}

const skipLinkStyles = {
  bgcolor: "background.paper",
  color: "primary.main",
  left: 8,
  p: 1.5,
  position: "fixed",
  top: 8,
  transform: "translateY(-180%)",
  zIndex: (theme) => theme.zIndex.tooltip,
  "&:focus": {
    transform: "translateY(0)",
  },
};
