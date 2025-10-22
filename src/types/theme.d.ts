import type { MD3Theme } from 'react-native-paper';

declare module 'react-native-paper' {
  interface MD3Theme {
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    elevation: {
      level0: number;
      level1: number;
      level2: number;
      level3: number;
      level4: number;
      level5: number;
    };
    borderRadius: {
      none: number;
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      round: number;
    };
    colors: MD3Theme['colors'] & {
      success: string;
      onSuccess: string;
      successContainer: string;
      onSuccessContainer: string;
      warning: string;
      onWarning: string;
      warningContainer: string;
      onWarningContainer: string;
      info: string;
      onInfo: string;
      infoContainer: string;
      onInfoContainer: string;
    };
  }
}