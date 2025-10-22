/**
 * Theme utilities and examples for consistent usage across the app
 */

import { StyleSheet } from 'react-native';
import type { AppTheme } from '../theme';

/**
 * Example of creating theme-aware styles
 * Usage: const styles = createThemedStyles(theme);
 */
export const createThemedStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Surface styling
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      elevation: theme.elevation.level1,
      padding: theme.spacing.md,
    },
    
    // Text styling
    primaryText: {
      color: theme.colors.onSurface,
      fontSize: 16,
    },
    
    secondaryText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
    },
    
    // Button styling
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    
    // Container styling
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },
    
    section: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    
    // Semantic colors
    successContainer: {
      backgroundColor: theme.colors.successContainer,
      borderColor: theme.colors.success,
      borderWidth: 1,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
    },
    
    successText: {
      color: theme.colors.onSuccessContainer,
    },
    
    errorContainer: {
      backgroundColor: theme.colors.errorContainer,
      borderColor: theme.colors.error,
      borderWidth: 1,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
    },
    
    errorText: {
      color: theme.colors.onErrorContainer,
    },
  });

/**
 * Common elevation styles
 * Usage: elevationStyle(theme, 2)
 */
export const elevationStyle = (theme: AppTheme, level: keyof AppTheme['elevation']) => ({
  elevation: theme.elevation[level],
  shadowColor: theme.colors.onSurface,
  shadowOffset: { width: 0, height: level === 'level0' ? 0 : 2 },
  shadowOpacity: 0.1,
  shadowRadius: theme.elevation[level],
});

/**
 * Border styles with theme colors
 */
export const borderStyles = (theme: AppTheme) => ({
  subtle: {
    borderColor: theme.colors.outline,
    borderWidth: 1,
  },
  
  prominent: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  
  error: {
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
});

/**
 * Spacing utilities
 */
export const spacing = {
  // Margin utilities
  marginTop: (theme: AppTheme, size: keyof AppTheme['spacing']) => ({
    marginTop: theme.spacing[size],
  }),
  
  marginBottom: (theme: AppTheme, size: keyof AppTheme['spacing']) => ({
    marginBottom: theme.spacing[size],
  }),
  
  marginHorizontal: (theme: AppTheme, size: keyof AppTheme['spacing']) => ({
    marginHorizontal: theme.spacing[size],
  }),
  
  // Padding utilities
  paddingAll: (theme: AppTheme, size: keyof AppTheme['spacing']) => ({
    padding: theme.spacing[size],
  }),
  
  paddingHorizontal: (theme: AppTheme, size: keyof AppTheme['spacing']) => ({
    paddingHorizontal: theme.spacing[size],
  }),
  
  paddingVertical: (theme: AppTheme, size: keyof AppTheme['spacing']) => ({
    paddingVertical: theme.spacing[size],
  }),
};