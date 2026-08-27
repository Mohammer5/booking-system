import { createTheme } from "@mui/material/styles";

const focusOutline = "3px solid #0b57d0";

export const applicationTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": {
            outline: focusOutline,
            outlineOffset: 3,
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        "#root": {
          minHeight: "100vh",
        },
        "*:focus-visible": {
          outline: focusOutline,
          outlineOffset: 3,
        },
        body: {
          minWidth: 320,
        },
      },
    },
  },
  palette: {
    background: {
      default: "#f4f7fb",
      paper: "#ffffff",
    },
    primary: {
      dark: "#073b8c",
      light: "#5d8fe8",
      main: "#0b57d0",
    },
    secondary: {
      dark: "#315f5a",
      light: "#8dbcb5",
      main: "#4f7c76",
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: "clamp(1.75rem, 6vw, 2.5rem)",
      fontWeight: 700,
      lineHeight: 1.15,
    },
    h2: {
      fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
      fontWeight: 700,
      lineHeight: 1.2,
    },
  },
});
