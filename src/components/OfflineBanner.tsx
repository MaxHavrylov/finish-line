import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const BANNER_HEIGHT = 48;

// Custom hook to check online status
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // Try to fetch a small resource to check connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        setIsOnline(true);
      } catch (error) {
        setIsOnline(false);
      }
    };

    // Check immediately
    checkConnectivity();

    // Check every 10 seconds
    const interval = setInterval(checkConnectivity, 10000);

    return () => clearInterval(interval);
  }, []);

  return isOnline;
}

export default function OfflineBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [slideAnim] = useState(new Animated.Value(-BANNER_HEIGHT));

  useEffect(() => {
    if (!isOnline) {
      // Show banner
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Hide banner
      Animated.timing(slideAnim, {
        toValue: -BANNER_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, slideAnim]);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        }
      ]}
      testID="offline-banner"
    >
      <Surface 
        style={[
          styles.banner, 
          { 
            backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primary,
          }
        ]}
        elevation={2}
      >
        <View style={styles.content}>
          <Ionicons 
            name="wifi-outline" 
            size={20} 
            color={theme.dark ? theme.colors.primary : theme.colors.onPrimary}
            style={styles.icon}
          />
          <Text 
            variant="bodyMedium" 
            style={[
              styles.text,
              { color: theme.dark ? theme.colors.primary : theme.colors.onPrimary }
            ]}
          >
            {t('offlineNotice')}
          </Text>
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: BANNER_HEIGHT,
  },
  banner: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '500',
  },
});