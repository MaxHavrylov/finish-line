import { useEffect, useCallback, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

interface UseModalBackCloseProps {
  isVisible: boolean;
  onDismiss: () => void;
}

/**
 * Custom hook to handle modal dismissal on Android back button press
 * and provide consistent dismiss behavior across platforms.
 * 
 * @param isVisible - Whether the modal is currently visible
 * @param onDismiss - Callback function to dismiss the modal
 */
export function useModalBackClose({ isVisible, onDismiss }: UseModalBackCloseProps) {
  const isVisibleRef = useRef(isVisible);
  const onDismissRef = useRef(onDismiss);

  // Update refs to avoid stale closures
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const handleBackPress = useCallback(() => {
    if (isVisibleRef.current) {
      onDismissRef.current();
      return true; // Prevent default back behavior
    }
    return false; // Allow default back behavior
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isVisible) {
        // Add back handler when modal becomes visible
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        
        return () => {
          // Clean up listener when modal is hidden or component unmounts
          backHandler.remove();
        };
      }
    }
  }, [isVisible, handleBackPress]);

  // Return dismiss function for use with overlay taps or swipe gestures
  return {
    dismiss: onDismiss,
  };
}