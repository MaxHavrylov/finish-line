import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { EventCategory, EventSummary } from '@/types/events';
import OfflineBanner from '../components/OfflineBanner';
import { View, StyleSheet, FlatList, Linking, RefreshControl, Image } from "react-native";
import { 
  Card, Text, Button, ActivityIndicator, useTheme, Divider, Chip, TextInput, SegmentedButtons
} from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { providersRepo } from "@/repositories/providersRepo";
import { trackProviderFollow, trackProviderUnfollow } from "@/services/analytics";
import { addNotification } from "@/repositories/notificationsRepo";
import { saveFiltersDebounced, loadFilters } from "@/utils/storage";

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
  total?: number;
};

type DateWindow = 'ANY' | '30D' | '90D';
type SortOption = 'SOONEST' | 'LATEST';

interface ProviderFilters {
  searchText: string;
  dateWindow: DateWindow;
  sortOption: SortOption;
}

export default function ProviderDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();

  // Race condition prevention
  const isMounted = useRef(true);
  const loadInFlight = useRef(false);
  const filtersDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { providerId } = route.params as ProviderDetailsParams;
  
  const [providerData, setProviderData] = useState<ProviderWithEvents | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateWindow, setDateWindow] = useState<DateWindow>('ANY');
  const [sortOption, setSortOption] = useState<SortOption>('SOONEST');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (filtersDebounceRef.current) {
        clearTimeout(filtersDebounceRef.current);
        filtersDebounceRef.current = null;
      }
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setDebouncedSearch(searchText);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Filter persistence
  const getFiltersKey = useCallback(() => `provider_filters_${providerId}_v1`, [providerId]);

  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await loadFilters<ProviderFilters>(getFiltersKey());
      if (savedFilters) {
        console.log('[ProviderDetailsScreen] Restoring saved filters for provider:', providerId);
        setSearchText(savedFilters.searchText || '');
        setDateWindow(savedFilters.dateWindow || 'ANY');
        setSortOption(savedFilters.sortOption || 'SOONEST');
      }
    } catch (error) {
      console.warn('[ProviderDetailsScreen] Failed to load saved filters:', error);
    }
  }, [providerId, getFiltersKey]);

  const saveCurrentFilters = useCallback(() => {
    const filters: ProviderFilters = {
      searchText,
      dateWindow,
      sortOption
    };
    saveFiltersDebounced(getFiltersKey(), filters);
  }, [searchText, dateWindow, sortOption, getFiltersKey]);

  const loadProviderData = useCallback(async (
    page: number = 1, 
    isRefresh: boolean = false, 
    append: boolean = false
  ) => {
    try {
      if (page === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = {
        page,
        pageSize: 20,
        search: debouncedSearch,
        dateWindow,
        sort: sortOption
      };

      const [data, following] = await Promise.all([
        providersRepo.listEventsByProvider(providerId, params),
        page === 1 ? providersRepo.isFollowing('me', providerId) : Promise.resolve(isFollowing)
      ]);

      if (page === 1) {
        setProviderData(data);
        setCurrentPage(1);
      } else if (append && providerData) {
        setProviderData(prev => prev ? {
          ...prev,
          events: [...prev.events, ...data.events],
          total: data.total
        } : data);
        setCurrentPage(page);
      }

      // Check if there are more pages
      const totalLoaded = page === 1 ? data.events.length : (providerData?.events.length || 0) + data.events.length;
      setHasMorePages(data.total ? totalLoaded < data.total : data.events.length === 20);

      if (page === 1) {
        setIsFollowing(following);
      }
    } catch (err) {
      console.warn('Failed to load provider data:', err);
      setError(err instanceof Error ? err.message : t('providerErrorText'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [providerId, debouncedSearch, dateWindow, sortOption, isFollowing, providerData, t]);

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, [loadSavedFilters]);

  useEffect(() => {
    loadProviderData(1, false, false);
  }, [debouncedSearch, dateWindow, sortOption, providerId]);

  // Save filters whenever they change (after initial load)
  useEffect(() => {
    if (!loading) {
      saveCurrentFilters();
    }
  }, [searchText, dateWindow, sortOption, loading, saveCurrentFilters]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return; // Guard against concurrent requests
    loadProviderData(1, true, false);
  }, [loadProviderData, refreshing]);

  // Image preloading helper
  const preloadNextImages = useCallback(async (currentEvents: any[]) => {
    if (!providerData?.events || currentEvents.length === 0) return;
    
    try {
      // Get next batch of events that might be loaded
      const nextBatchStart = currentEvents.length;
      const nextBatchEnd = Math.min(nextBatchStart + 12, providerData.events.length); // 12 matches maxToRenderPerBatch
      const nextBatchEvents = providerData.events.slice(nextBatchStart, nextBatchEnd);
      
      // Prefetch images for the next batch
      const preloadPromises = nextBatchEvents
        .filter(event => event.coverImage)
        .map(event => {
          try {
            return Image.prefetch(event.coverImage!);
          } catch (error) {
            console.warn('[ProviderDetailsScreen] Failed to prefetch image:', error);
            return Promise.resolve(); // Don't let one failure stop others
          }
        });
      
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('[ProviderDetailsScreen] Failed to preload images:', error);
    }
  }, [providerData?.events]);

  // Performance optimizations
  const endReachedInFlight = useRef(false);
  const handleLoadMore = useCallback(() => {
    if (endReachedInFlight.current) return;
    if (!loadingMore && hasMorePages && providerData) {
      endReachedInFlight.current = true;
      
      // Preload images for next batch before loading more data
      preloadNextImages(providerData.events);
      
      loadProviderData(currentPage + 1, false, true);
      setTimeout(() => { endReachedInFlight.current = false; }, 300);
    }
  }, [loadingMore, hasMorePages, providerData, currentPage, loadProviderData, preloadNextImages]);

  const keyExtractor = useCallback((item: any) => item.id, []);
  const ItemSeparatorComponent = useCallback(() => <Divider style={{ marginVertical: 8 }} />, []);
  
  // getItemLayout for smooth scrolling performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 190, // Estimated height for event cards (Card.Cover + Card.Title + Card.Content)
    offset: 190 * index,
    index,
  }), []);

  // Filter options
  const dateOptions = useMemo(() => [
    { label: t('any'), value: 'ANY' as DateWindow },
    { label: t('days30'), value: '30D' as DateWindow },
    { label: t('days90'), value: '90D' as DateWindow }
  ], [t]);

  const sortOptions = useMemo(() => [
    { label: t('soonest'), value: 'SOONEST' as SortOption },
    { label: t('latest'), value: 'LATEST' as SortOption }
  ], [t]);

  const handleToggleFollow = useCallback(async () => {
    if (!providerData) return;
    
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    
    // Optimistic UI update
    setIsFollowing(!wasFollowing);
    
    try {
      if (wasFollowing) {
        await providersRepo.unfollow('me', providerData.id);
        // Track successful unfollow
        trackProviderUnfollow(providerData.id);
      } else {
        await providersRepo.follow('me', providerData.id);
        // Track successful follow
        trackProviderFollow(providerData.id);
        
        // Add follow notification
        try {
          await addNotification({
            type: 'provider_follow',
            title: t('common:notif.followProviderTitle', { provider: providerData.name }),
            body: t('common:notif.followProviderBody')
          });
        } catch (notifError) {
          // Silent fail for notifications
          console.warn('Failed to add notification:', notifError);
        }
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
              accessibilityLabel={t(isFollowing ? 'unfollowProvider' : 'followProvider')}
              icon={isFollowing ? "bell-off" : "bell-plus"}
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
                accessibilityLabel={t('website')}
                icon="open-in-new"
              >
                {t('website')}
              </Button>
            )}
          </View>
        )
      });
    }
  }, [providerData, isFollowing, followLoading, navigation, t, handleToggleFollow]);

  // Memoized event card component
  const EventCard = React.memo(function EventCard({ item, onPress }: { item: any, onPress: () => void }) {
    const location = [item.city, item.country].filter(Boolean).join(", ");
    
    return (
      <Card style={styles.eventCard} onPress={onPress}>
        {item.coverImage ? (
          <Image
            source={{ uri: item.coverImage }}
            style={styles.cardCover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <ActivityIndicator size="small" />
          </View>
        )}
        <Card.Title
          title={item.title}
          subtitle={new Date(item.startDate).toDateString()}
        />
        <Card.Content>
          {location && (
            <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
              {location}
            </Text>
          )}
          <View style={styles.chipRow}>
            <Chip
              style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={{ color: theme.colors.onPrimaryContainer }}
            >
              {item.eventCategory}
            </Chip>
            {item.minDistanceLabel && (
              <Chip
                style={[styles.chip, { backgroundColor: theme.colors.elevation.level1 }]}
              >
                {item.minDistanceLabel}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  });

  const renderEvent = useCallback(({ item }: { item: any }) => {
    const handlePress = () => (navigation as any).navigate("EventDetails", {
      fromTab: (route.params as any)?.fromTab || 'DiscoverTab',
      event: {
        id: item.id,
        title: item.title,
        date: item.startDate,
        location: [item.city, item.country].filter(Boolean).join(", "),
        category: item.eventCategory,
        distance: item.minDistanceLabel ?? "",
        image: item.coverImage
      }
    });
    
    return <EventCard item={item} onPress={handlePress} />;
  }, [navigation, route.params]);

  const renderFilters = useCallback(() => (
    <View style={styles.filtersContainer}>
      <TextInput
        mode="outlined"
        placeholder={t('search')}
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
        testID="provider-search"
        accessibilityLabel={t('search')}
      />
      
      <View style={styles.filterRow}>
        <View style={styles.dateFilterContainer} testID="provider-date-filter">
          {dateOptions.map((option) => (
            <Chip
              key={option.value}
              mode={dateWindow === option.value ? 'flat' : 'outlined'}
              selected={dateWindow === option.value}
              onPress={() => setDateWindow(option.value)}
              style={[
                styles.filterChip,
                dateWindow === option.value && { backgroundColor: theme.colors.primaryContainer }
              ]}
              textStyle={dateWindow === option.value ? { color: theme.colors.onPrimaryContainer } : undefined}
            >
              {option.label}
            </Chip>
          ))}
        </View>

        <View style={styles.sortContainer} testID="provider-sort">
          <SegmentedButtons
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SortOption)}
            buttons={sortOptions.map(option => ({
              value: option.value,
              label: option.label
            }))}
            style={styles.segmentedButtons}
          />
        </View>
      </View>
    </View>
  ), [searchText, t, dateOptions, dateWindow, theme.colors, sortOption, sortOptions]);

  const renderListFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" />
        </View>
      );
    }
    return null;
  }, [loadingMore]);

  const renderEmptyState = () => (
    <View style={styles.emptyState} testID="provider-empty">
      <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
        {t('providerNoEventsTitle')}
      </Text>
      <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.7 }}>
        {t('providerNoEvents')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={{ marginTop: 16 }}>{t('loadingProvider')}</Text>
      </View>
    );
  }

  if (error || !providerData) {
    return (
      <View style={styles.errorContainer} testID="provider-error">
        <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
          {t('providerErrorTitle')}
        </Text>
        <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.7, marginBottom: 16 }}>
          {error || t('providerErrorText')}
        </Text>
        <Button mode="contained" onPress={() => loadProviderData(1, false, false)}>
          {t('tryAgain')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="provider-header">
      <OfflineBanner />
      {renderFilters()}
      <FlatList
        data={providerData.events}
        renderItem={renderEvent}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={styles.listContent}
        testID="provider-events-list"
        initialNumToRender={10}
        maxToRenderPerBatch={12}
        windowSize={8}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            testID="refresh-provider"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
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
    elevation: 1,
  },
  cardCover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f5f5f5',
  },
  placeholderContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 16 / 9,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  searchInput: {
    marginBottom: 12,
  },
  filterRow: {
    gap: 12,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  sortContainer: {
    flex: 1,
  },
  segmentedButtons: {
    maxWidth: 300,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});