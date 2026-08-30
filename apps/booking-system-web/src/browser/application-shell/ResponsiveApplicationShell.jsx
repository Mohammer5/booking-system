import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
 * @param {((onNavigate?: () => void) => import("react").ReactNode) | undefined}
 * props.renderAuthenticatedNavigation Active-context navigation renderer.
 * @returns {import("react").ReactElement} The application frame.
 */
export function ResponsiveApplicationShell({
  children,
  context,
  renderAuthenticatedNavigation,
}) {
  const { t } = useTranslation();
  const contextConfiguration = contexts[context];
  const theme = useTheme();
  const isWideScreen = useMediaQuery(theme.breakpoints.up("md"));

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
        renderAuthenticatedNavigation={renderAuthenticatedNavigation}
        translate={t}
      />
      <ApplicationContent
        isWideScreen={isWideScreen}
        renderAuthenticatedNavigation={renderAuthenticatedNavigation}
      >
        {children}
      </ApplicationContent>
    </Box>
  );
}

/** @returns {import("react").ReactElement} The shell's sole main landmark. */
function ApplicationContent({
  children,
  isWideScreen,
  renderAuthenticatedNavigation,
}) {
  const hasAuthenticatedNavigation = Boolean(renderAuthenticatedNavigation);

  return (
    <Container
      component="main"
      id="main-content"
      maxWidth={hasAuthenticatedNavigation ? false : "lg"}
      tabIndex={-1}
      sx={{
        maxWidth: hasAuthenticatedNavigation ? "96rem" : undefined,
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 5 },
      }}
    >
      {hasAuthenticatedNavigation ? (
        <AuthenticatedContentLayout
          isWideScreen={isWideScreen}
          renderNavigation={renderAuthenticatedNavigation}
        >
          {children}
        </AuthenticatedContentLayout>
      ) : children}
    </Container>
  );
}

/** @returns {import("react").ReactElement} Wide Admin sidebar and content. */
function AuthenticatedContentLayout({
  children,
  isWideScreen,
  renderNavigation,
}) {
  return (
    <Box sx={authenticatedContentStyles}>
      {isWideScreen ? (
        <Box component="aside" sx={authenticatedSidebarStyles}>
          {renderNavigation()}
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/**
 * Present the responsive banner and its transient mobile navigation.
 *
 * @param {object} props Presentation properties.
 * @returns {import("react").ReactElement} The application banner.
 */
function ApplicationHeader({
  contextTitle,
  renderAuthenticatedNavigation,
  translate,
}) {
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
      <MobileNavigationDrawer
        closeNavigation={closeNavigation}
        isNavigationOpen={isNavigationOpen}
        renderAuthenticatedNavigation={renderAuthenticatedNavigation}
        translate={translate}
      />
    </AppBar>
  );
}

/** @returns {import("react").ReactElement} The sole narrow navigation Drawer. */
function MobileNavigationDrawer(props) {
  return (
    <Drawer anchor="right" open={props.isNavigationOpen} onClose={props.closeNavigation}>
      <Box sx={{ p: 2, width: "min(82vw, 20rem)" }}>
        <Button
          ref={focusCloseNavigationControl}
          onClick={props.closeNavigation}
          variant="outlined"
        >
          {props.translate("applicationShell.navigation.close")}
        </Button>
        <Typography component="h2" sx={{ mt: 3 }} variant="h2">
          {props.translate("applicationShell.navigation.title")}
        </Typography>
        <ApplicationNavigation
          onNavigate={props.closeNavigation}
          translate={props.translate}
        />
        {props.isNavigationOpen && props.renderAuthenticatedNavigation ? (
          <>
            <Divider sx={{ my: 3 }} />
            {props.renderAuthenticatedNavigation(props.closeNavigation)}
          </>
        ) : null}
      </Box>
    </Drawer>
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

const authenticatedContentStyles = {
  display: { md: "grid" },
  gap: { md: 4 },
  gridTemplateColumns: { md: "16rem minmax(0, 1fr)" },
};

const authenticatedSidebarStyles = {
  alignSelf: "start",
  display: { xs: "none", md: "block" },
  maxHeight: "calc(100vh - 3rem)",
  overflowY: "auto",
  position: "sticky",
  top: 24,
};
