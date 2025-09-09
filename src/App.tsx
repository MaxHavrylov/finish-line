// App root: providers + theming + i18n + a simple Home screen
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";

// Initialize i18n side-effects
import "./i18n";

import { theme } from "./theme";
import HomeScreen from "./screens/HomeScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <HomeScreen />
      </PaperProvider>
    </SafeAreaProvider>
  );
}