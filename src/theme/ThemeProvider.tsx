import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { getItem, setItem } from "@/utils/storage";
import { lightTheme, darkTheme, type AppTheme } from "./index";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  theme: AppTheme;
  isDark: boolean;
};

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {},
  theme: lightTheme,
  isDark: false,
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
  const currentTheme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const ctx = useMemo(() => ({ 
    mode, 
    setMode, 
    theme: currentTheme, 
    isDark 
  }), [mode, setMode, currentTheme, isDark]);

  return (
    <ThemeContext.Provider value={ctx}>
      <PaperProvider theme={currentTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}