import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  StatusBar,
} from "react-native";
import {
  Text,
  Card,
  Avatar,
  Chip,
  Button,
  Searchbar,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { mockRunners, Runner } from "@/data/mockRunners";

const PAGE_SIZE = 20;

function RunnerCard({ runner, onViewRunner }: { runner: Runner, onViewRunner: () => void }) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  
  // Get initials for avatar
  const initials = runner.name
    .split(" ")
    .map(name => name.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);

  // Generate random but deterministic avatar color based on runner ID
  const avatarColor = useMemo(() => {
    const id = parseInt(runner.id.replace(/\D/g, "") || "1", 10);
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.tertiary,
      theme.colors.errorContainer,
      theme.colors.primary,
    ];
    return colors[id % colors.length];
  }, [runner.id, theme.colors]);

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Avatar.Text 
          size={50} 
          label={initials} 
          color="white"
          style={{ backgroundColor: avatarColor }}
        />
        <View style={styles.runnerInfo}>
          <Text variant="titleMedium">{runner.name}</Text>
          <Text variant="bodyMedium" style={styles.location}>
            {runner.location}
          </Text>
          {runner.stats && (
            <View style={styles.stats}>
              <Text variant="bodySmall">
                {t('races')}: {runner.stats.races} • {t('prs')}: {runner.stats.prs}
              </Text>
            </View>
          )}
        </View>
        <Button
          mode="outlined"
          onPress={onViewRunner}
          style={styles.viewButton}
          accessibilityLabel={t('viewRunner')}
        >
          {t('viewRunner')}
        </Button>
      </Card.Content>
    </Card>
  );
}

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation('common');
  
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Available locations for filtering
  const locations = useMemo(() => {
    const locSet = new Set(mockRunners.map(r => r.location));
    return Array.from(locSet).sort();
  }, []);

  // Filter runners based on search and location
  const filteredRunners = useMemo(() => {
    return mockRunners.filter(runner => {
      const matchesSearch = search
        ? runner.name.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesLocation = locationFilter
        ? runner.location === locationFilter
        : true;
      return matchesSearch && matchesLocation;
    });
  }, [search, locationFilter]);

  // Paginate the filtered runners
  const paginatedRunners = useMemo(() => {
    return filteredRunners.slice(0, page * PAGE_SIZE);
  }, [filteredRunners, page]);

  const handleEndReached = useCallback(() => {
    if (paginatedRunners.length < filteredRunners.length) {
      setIsLoading(true);
      // Simulate network delay
      setTimeout(() => {
        setPage(prev => prev + 1);
        setIsLoading(false);
      }, 500);
    }
  }, [paginatedRunners.length, filteredRunners.length]);

  const onRefresh = useCallback(async () => {
    if (refreshing) return; // Guard against concurrent requests
    
    setRefreshing(true);
    try {
      console.log('[CommunityScreen] Refreshing data...');
      // Reset to first page and clear any loading states
      setPage(1);
      setIsLoading(false);
      
      // Simulate network delay for refresh
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn('[CommunityScreen] Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleViewRunner = useCallback((runnerId: string) => {
    // @ts-ignore - We know this route exists in our stack navigator
    navigation.navigate('RunnerDetails', { runnerId });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Runner }) => (
    <RunnerCard 
      runner={item} 
      onViewRunner={() => handleViewRunner(item.id)} 
    />
  ), [handleViewRunner]);

  const toggleLocationFilter = useCallback((location: string) => {
    setLocationFilter(prev => prev === location ? '' : location);
    setPage(1); // Reset pagination when filter changes
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar />
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>{t('community')}</Text>
        
        <Searchbar
          placeholder={t('search')}
          onChangeText={text => {
            setSearch(text);
            setPage(1); // Reset pagination when search changes
          }}
          value={search}
          style={styles.searchBar}
          testID="community-search"
        />
        
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('location')}:
        </Text>
        
        <View style={styles.locationFilter} testID="community-location-filter">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map(location => (
              <Chip
                key={location}
                selected={location === locationFilter}
                onPress={() => toggleLocationFilter(location)}
                style={styles.locationChip}
                mode="outlined"
              >
                {location}
              </Chip>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={paginatedRunners}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            testID="refresh-community"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="bodyLarge">{t('emptyList')}</Text>
          </View>
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loading} />
          ) : null
        }
        testID="community-list"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  searchBar: {
    marginBottom: 12,
  },
  filterLabel: {
    marginBottom: 8,
  },
  locationFilter: {
    flexDirection: "row",
    marginBottom: 8,
  },
  locationChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  runnerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  location: {
    opacity: 0.7,
  },
  stats: {
    marginTop: 4,
  },
  viewButton: {
    marginLeft: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  loading: {
    padding: 16,
  },
});
