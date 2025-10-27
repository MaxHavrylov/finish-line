import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { Snackbar } from 'react-native-paper';

interface SnackbarMessage {
  id: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
}

interface SnackbarContextValue {
  showError: (message: string, action?: SnackbarMessage['action']) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  hideSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

interface SnackbarProviderProps {
  children: ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [snackbarQueue, setSnackbarQueue] = useState<SnackbarMessage[]>([]);
  const [currentSnackbar, setCurrentSnackbar] = useState<SnackbarMessage | null>(null);

  const generateId = useCallback(() => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }, []);

  const showSnackbar = useCallback((message: string, action?: SnackbarMessage['action'], duration = 4000) => {
    const newSnackbar: SnackbarMessage = {
      id: generateId(),
      message,
      action,
      duration,
    };

    setSnackbarQueue(prev => [...prev, newSnackbar]);
  }, [generateId]);

  const showError = useCallback((message: string, action?: SnackbarMessage['action']) => {
    showSnackbar(message, action, 5000); // Longer duration for errors
  }, [showSnackbar]);

  const showSuccess = useCallback((message: string) => {
    showSnackbar(message, undefined, 3000); // Shorter duration for success
  }, [showSnackbar]);

  const showInfo = useCallback((message: string) => {
    showSnackbar(message, undefined, 4000); // Default duration for info
  }, [showSnackbar]);

  const hideSnackbar = useCallback(() => {
    setCurrentSnackbar(null);
  }, []);

  // Process queue when current snackbar is dismissed or when queue changes
  React.useEffect(() => {
    if (!currentSnackbar && snackbarQueue.length > 0) {
      const nextSnackbar = snackbarQueue[0];
      setCurrentSnackbar(nextSnackbar);
      setSnackbarQueue(prev => prev.slice(1));
    }
  }, [currentSnackbar, snackbarQueue]);

  const onDismiss = useCallback(() => {
    setCurrentSnackbar(null);
  }, []);

  const contextValue: SnackbarContextValue = {
    showError,
    showSuccess,
    showInfo,
    hideSnackbar,
  };

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      <Snackbar
        visible={!!currentSnackbar}
        onDismiss={onDismiss}
        duration={currentSnackbar?.duration || 4000}
        action={currentSnackbar?.action}
        style={{ zIndex: 1000 }}
      >
        {currentSnackbar?.message || ''}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}