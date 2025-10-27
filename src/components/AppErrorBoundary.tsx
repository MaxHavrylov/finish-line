import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    // Reset the error state
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
    
    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  onReset: () => void;
  error?: Error;
}

function ErrorFallback({ onReset, error }: ErrorFallbackProps) {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="warning-outline" 
              size={48} 
              color={theme.colors.error} 
            />
          </View>
          
          <Text variant="headlineSmall" style={styles.title}>
            Something went wrong
          </Text>
          
          <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            The app encountered an unexpected error. Don't worry, your data is safe.
          </Text>
          
          {__DEV__ && error && (
            <View style={styles.debugInfo}>
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                Debug Info:
              </Text>
              <Text variant="bodySmall" style={{ 
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'monospace',
                fontSize: 10
              }}>
                {error.name}: {error.message}
              </Text>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.actions}>
          <Button 
            mode="contained" 
            onPress={onReset}
            icon="refresh"
            style={styles.button}
          >
            Restart App
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  debugInfo: {
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: 8,
    marginTop: 8,
  },
  actions: {
    justifyContent: 'center',
    paddingBottom: 16,
  },
  button: {
    minWidth: 150,
  },
});

export default AppErrorBoundary;