import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppThemeProvider } from "./theme/ThemeProvider";
import AppNavigator from "./navigation/AppNavigator";
import "./i18n";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        {/* SafeAreaView ensures content doesn't go under time/battery bar */}
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          {/* Keep StatusBar managed by Expo; not translucent to avoid overlap */}
          <StatusBar style="auto" />
          <AppNavigator />
        </SafeAreaView>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}