import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { getItem, setItem } from "@/utils/storage";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {}
});

// keep green accent across both themes
const GREEN_500 = "#4CAF50";
const GREEN_700 = "#388E3C";
const GREEN_300 = "#81C784";

const buildLight = () => ({
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: GREEN_500,
    secondary: GREEN_700,
    tertiary: GREEN_300
  }
});

const buildDark = () => ({
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: GREEN_500,
    secondary: GREEN_700,
    tertiary: GREEN_300
  }
});

const STORAGE_KEY = "settings.themeMode"; // "system" | "light" | "dark"

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      const saved = await getItem<ThemeMode>(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setItem(STORAGE_KEY, m);
  }, []);

  const isDark = mode === "system" ? system === "dark" : mode === "dark";
  const theme = useMemo(() => (isDark ? buildDark() : buildLight()), [isDark]);

  const ctx = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ThemeContext.Provider value={ctx}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}