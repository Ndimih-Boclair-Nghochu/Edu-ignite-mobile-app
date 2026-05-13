import { DefaultTheme as NavigationDefaultTheme } from "@react-navigation/native";

export const palette = {
  background: "#F0F2F5",
  surface: "#FFFFFF",
  primary: "#264D73",
  primaryStrong: "#163552",
  secondary: "#67D0E4",
  accent: "#E7F8FC",
  text: "#102032",
  textMuted: "#667085",
  border: "#D6DEE8",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  infoSoft: "#DBEAFE",
  shadow: "rgba(38, 77, 115, 0.12)",
};

export const theme = {
  colors: palette,
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
};

export const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    background: palette.background,
    card: palette.surface,
    border: palette.border,
    primary: palette.primary,
    text: palette.text,
    notification: palette.secondary,
  },
};
