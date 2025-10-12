import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  useTheme, 
  ActivityIndicator, 
  Button,
  IconButton,
  Badge
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as notificationsRepo from '@/repositories/notificationsRepo';
import type { Notification } from '@/repositories/notificationsRepo';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsRepo.listAll();
      setNotifications(data);
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load notifications when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await notificationsRepo.markRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.warn('Failed to mark notification as read:', error);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsRepo.markAllRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.warn('Failed to mark all notifications as read:', error);
    }
  }, []);

  const handleDeleteNotification = useCallback(async (id: string) => {
    // For now, just mark as read instead of deleting
    // You could implement actual deletion in the repo if needed
    await handleMarkRead(id);
  }, [handleMarkRead]);

  const renderRightAction = useCallback((id: string, read: boolean) => (
    <View style={styles.rightActionContainer}>
      {!read && (
        <IconButton
          icon="check"
          iconColor={theme.colors.onSecondary}
          style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
          onPress={() => handleMarkRead(id)}
        />
      )}
    </View>
  ), [theme.colors, handleMarkRead]);

  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => {
    const createdDate = new Date(item.createdAt);
    const timeAgo = getTimeAgo(createdDate);

    return (
      <Swipeable renderRightActions={() => renderRightAction(item.id, item.read)}>
        <Card 
          style={[
            styles.notificationCard,
            !item.read && styles.unreadCard,
            { backgroundColor: item.read ? theme.colors.surface : theme.colors.secondaryContainer }
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text 
                variant="titleMedium" 
                style={[
                  styles.title,
                  !item.read && styles.unreadText
                ]}
              >
                {item.title}
              </Text>
              {!item.read && (
                <Badge style={styles.unreadBadge} />
              )}
            </View>
            
            {item.body && (
              <Text 
                variant="bodyMedium" 
                style={[
                  styles.body,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {item.body}
              </Text>
            )}
            
            <Text 
              variant="bodySmall" 
              style={[
                styles.timestamp,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              {timeAgo}
            </Text>
          </Card.Content>
        </Card>
      </Swipeable>
    );
  }, [theme.colors, renderRightAction]);

  const renderHeader = useCallback(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (unreadCount === 0) return null;

    return (
      <View style={styles.headerContainer}>
        <Button
          mode="outlined"
          onPress={handleMarkAllRead}
          testID="btn-mark-all-read"
          style={styles.markAllButton}
        >
          {t('markAllRead')}
        </Button>
      </View>
    );
  }, [notifications, handleMarkAllRead, t]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="notifications-outline" 
        size={64} 
        color={theme.colors.onSurfaceVariant} 
      />
      <Text 
        variant="titleMedium" 
        style={[
          styles.emptyText,
          { color: theme.colors.onSurfaceVariant }
        ]}
      >
        {t('noNotifications')}
      </Text>
    </View>
  ), [theme.colors.onSurfaceVariant, t]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
        testID="notifications-list"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  markAllButton: {
    alignSelf: 'flex-end',
  },
  notificationCard: {
    marginBottom: 0,
    elevation: 1,
  },
  unreadCard: {
    elevation: 2,
  },
  cardContent: {
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  body: {
    marginBottom: 8,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  separator: {
    height: 8,
  },
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  actionButton: {
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
});