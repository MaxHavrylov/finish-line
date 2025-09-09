// Simple Material 3 theme using react-native-paper defaults with a sporty primary
import { MD3LightTheme as DefaultTheme } from "react-native-paper";

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Accent associated with sport/energy, not orange to avoid Strava vibes
    primary: "#2563EB", // blue
    secondary: "#16A34A", // green
    tertiary: "#F59E0B"  // amber for highlights
  }
};