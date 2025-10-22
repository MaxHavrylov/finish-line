import { MD3LightTheme, MD3DarkTheme, MD3Theme } from "react-native-paper";

// Core brand colors
const PRIMARY = "#4CAF50";      // Green 500
const PRIMARY_DARK = "#388E3C";  // Green 700
const PRIMARY_LIGHT = "#81C784"; // Green 300

// Semantic color tokens
const COLORS_LIGHT = {
  // Primary brand colors
  primary: PRIMARY,
  onPrimary: "#FFFFFF",
  primaryContainer: "#C8E6C9", // Green 100
  onPrimaryContainer: "#1B5E20", // Green 900

  // Secondary colors
  secondary: "#66BB6A", // Green 400
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8F5E8", // Green 50
  onSecondaryContainer: "#2E7D32", // Green 800

  // Tertiary colors
  tertiary: "#4FC3F7", // Light Blue 300
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#E1F5FE", // Light Blue 50
  onTertiaryContainer: "#01579B", // Light Blue 900

  // Surface colors
  surface: "#FFFFFF",
  onSurface: "#1C1B1F",
  surfaceVariant: "#F5F5F5",
  onSurfaceVariant: "#49454F",

  // Background
  background: "#FEFBFF",
  onBackground: "#1C1B1F",

  // Outline and borders
  outline: "#E0E0E0",
  outlineVariant: "#F5F5F5",

  // Semantic states
  error: "#F44336", // Red 500
  onError: "#FFFFFF",
  errorContainer: "#FFEBEE", // Red 50
  onErrorContainer: "#C62828", // Red 800

  // Success (custom semantic color)
  success: "#4CAF50", // Green 500
  onSuccess: "#FFFFFF",
  successContainer: "#E8F5E8", // Green 50
  onSuccessContainer: "#2E7D32", // Green 800

  // Warning (custom semantic color)
  warning: "#FF9800", // Orange 500
  onWarning: "#FFFFFF",
  warningContainer: "#FFF3E0", // Orange 50
  onWarningContainer: "#E65100", // Orange 900

  // Info (custom semantic color)
  info: "#2196F3", // Blue 500
  onInfo: "#FFFFFF",
  infoContainer: "#E3F2FD", // Blue 50
  onInfoContainer: "#0D47A1", // Blue 900
};

const COLORS_DARK = {
  // Primary brand colors
  primary: PRIMARY,
  onPrimary: "#000000", // Pure black for better contrast on green
  primaryContainer: "#2E7D32", // Green 800
  onPrimaryContainer: "#C8E6C9", // Green 100

  // Secondary colors  
  secondary: "#81C784", // Green 300
  onSecondary: "#1B5E20",
  secondaryContainer: "#388E3C", // Green 700
  onSecondaryContainer: "#E8F5E8", // Green 50

  // Tertiary colors
  tertiary: "#81D4FA", // Light Blue 200
  onTertiary: "#003C4C",
  tertiaryContainer: "#0277BD", // Light Blue 800
  onTertiaryContainer: "#E1F5FE", // Light Blue 50

  // Surface colors
  surface: "#121212",
  onSurface: "#FFFFFF", // Pure white for maximum contrast
  surfaceVariant: "#1E1E1E",
  onSurfaceVariant: "#E0E0E0", // Lighter for better contrast

  // Background
  background: "#0D0D0D",
  onBackground: "#FFFFFF", // Pure white for maximum contrast

  // Outline and borders
  outline: "#424242",
  outlineVariant: "#2E2E2E",

  // Semantic states
  error: "#F44336", // Red 500
  onError: "#FFFFFF",
  errorContainer: "#B71C1C", // Red 900
  onErrorContainer: "#FFCDD2", // Red 100

  // Success (custom semantic color)
  success: "#66BB6A", // Green 400
  onSuccess: "#1B5E20",
  successContainer: "#2E7D32", // Green 800
  onSuccessContainer: "#C8E6C9", // Green 100

  // Warning (custom semantic color)
  warning: "#FFB74D", // Orange 300
  onWarning: "#E65100",
  warningContainer: "#F57C00", // Orange 700
  onWarningContainer: "#FFE0B2", // Orange 100

  // Info (custom semantic color)
  info: "#64B5F6", // Blue 300
  onInfo: "#0D47A1",
  infoContainer: "#1976D2", // Blue 700
  onInfoContainer: "#BBDEFB", // Blue 100
};

// Spacing scale (8px grid system)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Elevation levels
export const elevation = {
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
} as const;

// Border radius scale
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
} as const;

// Create typed theme objects
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...COLORS_LIGHT,
  },
  // Add custom properties
  spacing,
  elevation,
  borderRadius,
} as MD3Theme & {
  spacing: typeof spacing;
  elevation: typeof elevation;
  borderRadius: typeof borderRadius;
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...COLORS_DARK,
  },
  // Add custom properties
  spacing,
  elevation,
  borderRadius,
} as MD3Theme & {
  spacing: typeof spacing;
  elevation: typeof elevation;
  borderRadius: typeof borderRadius;
};

// Typography variant guide for consistent usage:
// - displayLarge/Medium/Small: For large decorative text
// - headlineLarge/Medium/Small: For main page headings 
// - titleLarge: For screen headers (replaces fontSize: 24+)
// - titleMedium: For card titles, section headers (replaces fontSize: 18-20)
// - titleSmall: For subsection headers (replaces fontSize: 16-17)
// - labelLarge: For buttons, chips, prominent labels (replaces fontSize: 14 bold)
// - labelMedium: For form labels, tabs (replaces fontSize: 12-13 bold)
// - labelSmall: For captions, metadata (replaces fontSize: 11-12)
// - bodyLarge: For important body text (replaces fontSize: 16)
// - bodyMedium: For standard body text (replaces fontSize: 14-15)
// - bodySmall: For supporting text (replaces fontSize: 12-13)

// Export theme type for TypeScript
export type AppTheme = typeof lightTheme;

// Legacy export for backwards compatibility
export const theme = lightTheme;