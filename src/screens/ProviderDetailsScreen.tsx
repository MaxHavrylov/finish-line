import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Linking } from "react-native";
import { 
  Card, Text, Button, ActivityIndicator, useTheme, Divider, Chip
} from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { providersRepo } from "@/repositories/providersRepo";

type ProviderDetailsParams = {
  providerId: string;
};

type ProviderWithEvents = {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  events: Array<{
    id: string;
    title: string;
    startDate: string;
    city?: string;
    country?: string;
    eventCategory: string;
    coverImage?: string;
    minDistanceLabel?: string;
  }>;
};

export default function ProviderDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { providerId } = route.params as ProviderDetailsParams;
  
  const [providerData, setProviderData] = useState<ProviderWithEvents | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProviderData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, following] = await Promise.all([
        providersRepo.listEventsByProvider(providerId, { page: 1, pageSize: 50 }),
        providersRepo.isFollowing('me', providerId)
      ]);
      setProviderData(data);
      setIsFollowing(following);
    } catch (err) {
      console.warn('Failed to load provider data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load provider data');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProviderData();
  }, [loadProviderData]);

  const handleToggleFollow = useCallback(async () => {
    if (!providerData) return;
    
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    
    // Optimistic UI update
    setIsFollowing(!wasFollowing);
    
    try {
      if (wasFollowing) {
        await providersRepo.unfollow('me', providerData.id);
      } else {
        await providersRepo.follow('me', providerData.id);
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      console.warn('Failed to toggle follow status:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [providerData, isFollowing]);

  // Update header title when provider data loads
  useEffect(() => {
    if (providerData) {
      navigation.setOptions({ 
        title: providerData.name,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button
              mode={isFollowing ? "outlined" : "contained"}
              compact
              onPress={handleToggleFollow}
              loading={followLoading}
              disabled={followLoading}
              testID="btn-follow-provider"
              style={{ marginRight: 8 }}
            >
              {t(isFollowing ? 'unfollowProvider' : 'followProvider')}
            </Button>
            {providerData.website && (
              <Button
                mode="contained"
                compact
                onPress={() => providerData.website && Linking.openURL(providerData.website)}
                testID="btn-provider-website"
                style={{ marginRight: 8 }}
              >
                {t('actions.website')}
              </Button>
            )}
          </View>
        )
      });
    }
  }, [providerData, isFollowing, followLoading, navigation, t, handleToggleFollow]);

  const renderEvent = useCallback(({ item }: { item: any }) => {
    const location = [item.city, item.country].filter(Boolean).join(", ");
    
    return (
      <Card
        style={styles.eventCard}
        onPress={() =>
          (navigation as any).navigate("EventDetails", {
            event: {
              id: item.id,
              title: item.title,
              date: item.startDate,
              location,
              category: item.eventCategory,
              distance: item.minDistanceLabel ?? "",
              image: item.coverImage
            }
          })
        }
      >
        {item.coverImage && <Card.Cover source={{ uri: item.coverImage }} />}
        <Card.Title
          title={item.title}
          subtitle={new Date(item.startDate).toDateString()}
        />
        <Card.Content>
          {location && (
            <Text style={{ marginBottom: 8 }}>
              {location}
            </Text>
          )}
          <View style={styles.chipRow}>
            <Chip
              style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: "600" }}
            >
              {item.eventCategory}
            </Chip>
            {item.minDistanceLabel && (
              <Chip
                style={[styles.chip, { backgroundColor: theme.colors.elevation.level1 }]}
                textStyle={{ fontWeight: "600" }}
              >
                {item.minDistanceLabel}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  }, [navigation, theme]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
        No Events Found
      </Text>
      <Text style={{ textAlign: 'center', opacity: 0.7 }}>
        This provider doesn't have any events yet.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading provider details...</Text>
      </View>
    );
  }

  if (error || !providerData) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
          Error Loading Provider
        </Text>
        <Text style={{ textAlign: 'center', opacity: 0.7, marginBottom: 16 }}>
          {error || 'Provider not found'}
        </Text>
        <Button mode="contained" onPress={loadProviderData}>
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={providerData.events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
        contentContainerStyle={styles.listContent}
        testID="provider-events-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  eventCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});