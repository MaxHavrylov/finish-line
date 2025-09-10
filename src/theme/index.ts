import { MD3LightTheme as DefaultTheme } from "react-native-paper";

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#4CAF50",   // main accent (buttons, tabs, chips)
    secondary: "#388E3C", // darker green for contrast if needed
    tertiary: "#81C784",  // lighter green highlight
  }
};