import React, { useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppThemeProvider } from "./theme/ThemeProvider";
import AppNavigator from "./navigation/AppNavigator";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { SnackbarProvider } from "./components/useSnackbar";
import "./i18n";

export default function App() {
  const [appKey, setAppKey] = useState(0);

  const handleErrorBoundaryReset = () => {
    // Force a complete app restart by changing the key
    setAppKey(prev => prev + 1);
  };

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <SnackbarProvider>
          <AppErrorBoundary onReset={handleErrorBoundaryReset} key={appKey}>
            {/* SafeAreaView ensures content doesn't go under time/battery bar */}
            <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
              {/* Keep StatusBar managed by Expo; not translucent to avoid overlap */}
              <StatusBar style="auto" />
              <AppNavigator />
            </SafeAreaView>
          </AppErrorBoundary>
        </SnackbarProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}