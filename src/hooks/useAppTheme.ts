import { useContext } from 'react';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { ThemeContext } from '../theme/ThemeProvider';
import type { AppTheme } from '../theme';

/**
 * Hook to access the app theme with all custom properties
 * Provides both Paper's theme utilities and our custom tokens
 */
export function useAppTheme() {
  const paperTheme = usePaperTheme<AppTheme>();
  const { mode, setMode, isDark } = useContext(ThemeContext);
  
  return {
    ...paperTheme,
    mode,
    setMode,
    isDark,
    // Convenient aliases for common tokens
    colors: paperTheme.colors,
    spacing: paperTheme.spacing,
    elevation: paperTheme.elevation,
    borderRadius: paperTheme.borderRadius,
  };
}