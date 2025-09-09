import { MD3LightTheme as DefaultTheme } from "react-native-paper";

// Sporty lime/green accent
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#84cc16",   // lime-500 (main accent)
    secondary: "#16a34a", // emerald-600
    tertiary: "#22c55e",  // green-500
  }
};