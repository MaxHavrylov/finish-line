import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager
} from "react-native";
import {
  Card,
  Chip,
  Text,
  Divider,
  ActivityIndicator,
  useTheme,
  FAB,
  Portal,
  Modal,
  Button,
  TextInput
} from "react-native-paper";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { saveFiltersDebounced, loadFilters } from "../utils/storage";

import { EventSummary, EventCategory } from "../types/events";
import { seedMockIfEmpty, getEvents, listSummaries } from "../repositories/eventsRepo";
import { syncEvents } from "../sync/eventsSync";
import { isWithinDays } from "../utils/date";
import { listFavoriteIds, toggleFavorite } from "../repositories/favoritesRepo";
import { trackDiscoverToggleMap } from "../services/analytics";
import MapView from "../components/MapView";
import OfflineBanner from "../components/OfflineBanner";

// ---- Config / constants
type DateFilter = "Any" | "30d" | "90d";
type DistanceOption = "<=5" | "5-10" | ">10";

interface DiscoverFilters {
  selectedCategories: EventCategory[];
  dateFilter: DateFilter;
  locationText: string;
  selectedDistances: DistanceOption[];
  onlyFavorites: boolean;
}

const DISCOVER_FILTERS_KEY = "discover_filters_v1";
const GREEN = "#4CAF50";

const CATEGORY_OPTIONS: EventCategory[] = [
  "OCR",
  "Marathon",
  "HalfMarathon",
  "Triathlon",
  "Trail",
  "Cycling",
  "Swim",
  "Other"
];

const DISTANCE_OPTIONS: DistanceOption[] = ["<=5", "5-10", ">10"];

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Animation configurations
const FILTER_ANIMATION_CONFIG = {
  duration: 200,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

// ---- Screen-specific search/filter constants
const IS_NARROW_THRESHOLD = 600;

const CATEGORY_COLORS: Partial<Record<EventCategory, string>> = {
  OCR: "#22c55e",
  Marathon: "#f59e0b",
  HalfMarathon: "#06b6d4",
  Triathlon: "#8b5cf6",
  Trail: "#10b981",
  Cycling: "#ef4444",
  Swim: "#3b82f6",
  Other: GREEN
};

// ---- Layout numbers for stable filter pill widths (2 columns)
const SCREEN = Dimensions.get("window");
const H_PADDING = 16; // filtersWrap horizontal padding
const GAP = 12;       // space between pills
const COLUMNS = 2;
const PILL_WIDTH = Math.floor((SCREEN.width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

// utils
const parseDistanceKm = (label?: string): number | undefined => {
  if (!label) return undefined;
  const m = /(\d+(\.\d+)?)/.exec(label.replace(",", "."));
  return m ? parseFloat(m[1]) : undefined;
};

function FilterPill({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        pressed && { opacity: 0.85 } // no scale → no visual jump
      ]}
      hitSlop={6}
    >
      <Ionicons
        name={icon}
        size={16}
        color={theme.colors.onSurface}
        style={{ marginRight: 8 }}
      />
      <Text variant="labelMedium" numberOfLines={1} style={{ opacity: 0.9, flexShrink: 1, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}



export default function DiscoverScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const listRef = useRef<FlatList>(null);
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToTop, setShowToTop] = useState(false);

  const [events, setEvents] = useState<EventSummary[]>([]);
  
  // ---- view toggle
  const [isMapView, setIsMapView] = useState(false);

  // ---- filters
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("Any");
  const [locationText, setLocationText] = useState<string>("");
  const [selectedDistances, setSelectedDistances] = useState<DistanceOption[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // favorites state (persisted ids)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // ---- filter modals
  const [typeOpen, setTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);

  // Animated modal toggle functions
  const toggleTypeModal = useCallback(() => {
    LayoutAnimation.configureNext(FILTER_ANIMATION_CONFIG);
    setTypeOpen(prev => !prev);
  }, []);

  const toggleDateModal = useCallback(() => {
    LayoutAnimation.configureNext(FILTER_ANIMATION_CONFIG);
    setDateOpen(prev => !prev);
  }, []);

  const toggleLocationModal = useCallback(() => {
    LayoutAnimation.configureNext(FILTER_ANIMATION_CONFIG);
    setLocOpen(prev => !prev);
  }, []);

  const toggleDistanceModal = useCallback(() => {
    LayoutAnimation.configureNext(FILTER_ANIMATION_CONFIG);
    setDistOpen(prev => !prev);
  }, []);

  const load = useCallback(async () => {
    try {
      // Try the new listSummaries function which has fallback logic
      const data = await listSummaries();
      console.log('[DiscoverScreen] Loaded events:', data.length);
      setEvents(data);
    } catch (error) {
      console.warn('[DiscoverScreen] Error loading events:', error);
      // Fallback to getEvents if listSummaries fails
      const data = await getEvents();
      console.log('[DiscoverScreen] Fallback loaded events:', data.length);
      setEvents(data);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    const ids = await listFavoriteIds();
    setFavoriteIds(ids);
  }, []);

  // Filter persistence
  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await loadFilters<DiscoverFilters>(DISCOVER_FILTERS_KEY);
      if (savedFilters) {
        console.log('[DiscoverScreen] Restoring saved filters');
        setSelectedCategories(savedFilters.selectedCategories || []);
        setDateFilter(savedFilters.dateFilter || "Any");
        setLocationText(savedFilters.locationText || "");
        setSelectedDistances(savedFilters.selectedDistances || []);
        setOnlyFavorites(savedFilters.onlyFavorites || false);
      }
    } catch (error) {
      console.warn('[DiscoverScreen] Failed to load saved filters:', error);
    }
  }, []);

  const saveCurrentFilters = useCallback(() => {
    const filters: DiscoverFilters = {
      selectedCategories,
      dateFilter,
      locationText,
      selectedDistances,
      onlyFavorites
    };
    saveFiltersDebounced(DISCOVER_FILTERS_KEY, filters);
  }, [selectedCategories, dateFilter, locationText, selectedDistances, onlyFavorites]);


  const route = useRoute<any>();

  useEffect(() => {
    (async () => {
      try {
        console.log('[DiscoverScreen] Initial load starting...');
        await seedMockIfEmpty();
        console.log('[DiscoverScreen] Mock seeding completed');
        await load();
        console.log('[DiscoverScreen] Events loaded');
        await loadFavorites();
        console.log('[DiscoverScreen] Favorites loaded');
        
        // Load saved filters
        await loadSavedFilters();
        console.log('[DiscoverScreen] Filters loaded');
        
        // Load view preference
        const savedView = await AsyncStorage.getItem('discoverViewMode');
        if (savedView === 'map') {
          setIsMapView(true);
        }
      } catch (error) {
        console.warn('[DiscoverScreen] Error during initial load:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [load, loadFavorites, loadSavedFilters]);

  // Refresh favorites if navigated back from EventDetailsScreen with favoriteChanged param or on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const ids = await listFavoriteIds();
          if (isActive) setFavoriteIds(ids);
        } catch (e) {
          // Optionally log error
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // Save filters whenever they change (after initial load)
  useEffect(() => {
    if (!loading) {
      saveCurrentFilters();
    }
  }, [selectedCategories, dateFilter, locationText, selectedDistances, onlyFavorites, loading, saveCurrentFilters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('[DiscoverScreen] Refreshing data...');
      await syncEvents();
      await load();
      await loadFavorites();
    } catch (error) {
      console.warn('[DiscoverScreen] Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadFavorites]);

  // helper for distance matching
  const matchesAnySelectedDistance = (label?: string): boolean => {
    if (selectedDistances.length === 0) return true; // "Any"
    const d = parseDistanceKm(label);
    if (d == null) return false;
    return selectedDistances.some((opt) => {
      switch (opt) {
        case "<=5": return d <= 5;
        case "5-10": return d >= 5 && d <= 10;
        case ">10": return d > 10;
      }
    });
  };

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (onlyFavorites && !favoriteIds.has(e.id)) return false;               // ⭐ favorites
      if (selectedCategories.length > 0 && !selectedCategories.includes(e.eventCategory)) return false;
      if (dateFilter !== "Any") {
        if (dateFilter === "30d" && !isWithinDays(e.startDate, 30)) return false;
        if (dateFilter === "90d" && !isWithinDays(e.startDate, 90)) return false;
      }
      if (locationText.trim()) {
        const hay = `${e.city ?? ""} ${e.country ?? ""}`.toLowerCase();
        if (!hay.includes(locationText.trim().toLowerCase())) return false;
      }
      if (!matchesAnySelectedDistance(e.minDistanceLabel)) return false;
      return true;
    });
  }, [events, onlyFavorites, favoriteIds, selectedCategories, dateFilter, locationText, selectedDistances]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowToTop(e.nativeEvent.contentOffset.y > 600);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setDateFilter("Any");
    setLocationText("");
    setSelectedDistances([]);
    setOnlyFavorites(false);
  };

  const dataWithFilters = useMemo(
    () => [{ __type: "filters" } as any, ...filtered],
    [filtered]
  );

  // ---- togglers
  const toggleCategory = (c: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };
  const selectAllCategories = () => setSelectedCategories(CATEGORY_OPTIONS);
  const clearCategories = () => setSelectedCategories([]);

  const toggleDistance = (d: DistanceOption) => {
    setSelectedDistances((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };
  const selectAllDistances = () => setSelectedDistances(DISTANCE_OPTIONS);
  const clearDistances = () => setSelectedDistances([]);

  // card-level favorite toggle
  const onToggleFav = useCallback(async (eventId: string) => {
    const nowFav = await toggleFavorite(eventId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (nowFav) next.add(eventId); else next.delete(eventId);
      return next;
    });
  }, []);

  // map/list view toggle
  const toggleView = useCallback(async () => {
    const newIsMapView = !isMapView;
    setIsMapView(newIsMapView);
    await AsyncStorage.setItem('discoverViewMode', newIsMapView ? 'map' : 'list');
    
    // Track the view toggle
    trackDiscoverToggleMap(newIsMapView ? 'map' : 'list');
  }, [isMapView]);

  // labels with counts
  const typesLabel =
    selectedCategories.length > 0 ? `${t('raceTypes')} (${selectedCategories.length})` : t('raceTypes');
  const datesLabel = dateFilter === "Any" ? t('upcomingDates') : `${t('upcomingDates')} (1)`;
  const locationLabel = locationText.trim().length > 0 ? `${t('location')} (1)` : t('location');
  const distanceLabel =
    selectedDistances.length > 0 ? `${t('distance')} (${selectedDistances.length})` : t('distance');

  // ⭐ Favorites label shows the total count of liked events, regardless of toggle
  const favoritesCount = favoriteIds.size;
  const favoritesLabel = favoritesCount > 0 ? `${t('favorites')} (${favoritesCount})` : t('favorites');

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, padding: 16 }]}>
        <ActivityIndicator />
        <Text variant="bodyMedium" style={{ marginTop: 8 }}>Loading events…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      {/* Header */}
      <View style={[styles.headerWrap, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleLarge" style={styles.headerTitle}>{t('discoverTitle')}</Text>
        <View style={styles.headerActions}>
          <Pressable 
            hitSlop={8} 
            onPress={toggleView} 
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            accessibilityLabel={isMapView ? t('showList') : t('showMap')}
          >
            <Ionicons 
              name={isMapView ? "list-outline" : "map-outline"} 
              size={22} 
              color={theme.colors.onSurface} 
              style={{ marginRight: 14 }} 
            />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => {}} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} style={{ marginRight: 14 }} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => navigation.navigate("Profile")} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="person-circle-outline" size={26} color={theme.colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isMapView ? (
        <View style={{ flex: 1 }}>
          <MapView 
            events={filtered}
            onMarkerPress={(event: EventSummary) => navigation.navigate("EventDetails", { eventId: event.id, fromTab: 'DiscoverTab' })}
            loading={refreshing}
          />
          
          {/* Filter Status */}
          {(selectedCategories.length > 0 || dateFilter !== "Any" || locationText.trim() || selectedDistances.length > 0 || onlyFavorites) && (
            <View style={[styles.mapFilterStatus, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer }}>
                {filtered.length} event{filtered.length !== 1 ? 's' : ''} • Filters active
              </Text>
            </View>
          )}
          {/* Map View Actions */}
          <View style={styles.mapActionsContainer}>
            <FAB
              icon="refresh"
              onPress={onRefresh}
              style={[styles.mapActionFab, { backgroundColor: theme.colors.tertiary }]}
              color={theme.colors.onTertiary}
              size="small"
            />
            <FAB
              icon="filter-variant"
              onPress={toggleTypeModal}
              style={[styles.mapFiltersFab, { backgroundColor: theme.colors.secondary }]}
              color={theme.colors.onSecondary}
              size="medium"
            />
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={dataWithFilters}
          keyExtractor={(item, index) =>
            ("__type" in item ? "__filters" : item.id) + "-" + index
          }
        renderItem={({ item }) => {
          if ("__type" in item) {
            return (
              <View style={styles.filtersWrap}>
                <Text variant="titleMedium" style={styles.filtersTitle}>{t('filters')}</Text>

                <View style={styles.filtersGrid}>
                  <FilterPill icon="pulse-outline" label={typesLabel} onPress={toggleTypeModal} />
                  <FilterPill icon="calendar-outline" label={datesLabel} onPress={toggleDateModal} />
                  <FilterPill icon="location-outline" label={locationLabel} onPress={toggleLocationModal} />
                  <FilterPill icon="swap-vertical-outline" label={distanceLabel} onPress={toggleDistanceModal} />
                  {/* Favorites pill shows total liked count */}
                  <Pressable
                    onPress={() => setOnlyFavorites((v) => !v)}
                    style={({ pressed }) => [
                      styles.pill,
                      pressed && { opacity: 0.85 },
                      onlyFavorites && { backgroundColor: theme.colors.secondaryContainer }
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={onlyFavorites ? "heart" : "heart-outline"}
                      size={16}
                      color={onlyFavorites ? theme.colors.error : theme.colors.onSurface}
                      style={{ marginRight: 8 }}
                    />
                    <Text variant="labelMedium" numberOfLines={1} style={{ opacity: 0.9 }}>
                      {favoritesLabel}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.filtersBottomRow}>
                  <Pressable onPress={resetFilters} style={({ pressed }) => [styles.resetRow, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="filter-outline" size={16} color={GREEN} />
                    <Text variant="labelLarge" style={{ color: GREEN, marginLeft: 6 }}>{t('resetFilters')}</Text>
                  </Pressable>
                </View>

                <View style={{ height: 8 }} />
                
                {/* Empty state when no events match filters */}
                {filtered.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text variant="titleMedium" style={styles.emptyTitle}>
                      {t('noResults')}
                    </Text>
                    <Button mode="outlined" onPress={resetFilters} style={styles.emptyButton}>
                      {t('tryReset')}
                    </Button>
                  </View>
                )}
              </View>
            );
          }

          const e = item as EventSummary;
          const categoryColor = CATEGORY_COLORS[e.eventCategory] ?? GREEN;
          const isFav = favoriteIds.has(e.id);

          return (
            <Card
              style={styles.card}
              onPress={() =>
                navigation.navigate("EventDetails", {
                  fromTab: 'DiscoverTab',
                  event: {
                    id: e.id,
                    title: e.title,
                    date: e.startDate,
                    location: [e.city, e.country].filter(Boolean).join(", "),
                    category: e.eventCategory,
                    distance: e.minDistanceLabel ?? "",
                    image: e.coverImage ?? "https://picsum.photos/seed/fl/1200/600"
                  }
                })
              }
            >
              {e.coverImage && <Card.Cover source={{ uri: e.coverImage }} style={styles.cardCover} />}
              <Card.Title
                title={e.title}
                subtitle={new Date(e.startDate).toDateString()}
                right={() => (
                  <Pressable
                    hitSlop={8}
                    onPress={() => onToggleFav(e.id)}
                    style={({ pressed }) => [{ paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons
                      name={isFav ? "heart" : "heart-outline"}
                      size={22}
                      color={isFav ? theme.colors.error : theme.colors.onSurface}
                    />
                  </Pressable>
                )}
              />
              <Card.Content>
                {!!(e.city || e.country) && (
                  <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                    {[e.city, e.country].filter(Boolean).join(", ")}
                  </Text>
                )}
                <View style={styles.row}>
                  <Chip
                    style={[styles.tagChip, { backgroundColor: categoryColor + "22", borderColor: categoryColor }]}
                    textStyle={{ color: categoryColor }}
                    mode="outlined"
                  >
                    {e.eventCategory}
                  </Chip>
                  {e.minDistanceLabel ? (
                    <Chip
                      style={[styles.tagChip, { backgroundColor: theme.colors.elevation.level1 }]}
                    >
                      {e.minDistanceLabel}
                    </Chip>
                  ) : null}
                  {e.providerName ? (
                    <Chip
                      style={[styles.tagChip, { backgroundColor: theme.colors.surfaceVariant }]}
                      testID="chip-provider"
                    >
                      {e.providerName}
                    </Chip>
                  ) : null}
                </View>
              </Card.Content>
            </Card>
          );
        }}
          ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}

          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} testID="refresh-discover" />}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {!isMapView && showToTop && (
        <FAB
          icon="arrow-up"
          onPress={scrollToTop}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          testID="fab-scroll-top"
        />
      )}

      {/* Filter Modals */}
      <Portal>
        {/* Race Types (multi-select) */}
        <Modal
          visible={typeOpen}
          onDismiss={toggleTypeModal}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Race Types</Text>

          <View style={[styles.modalChipRow, { marginBottom: 8 }]}>
            <Chip mode="outlined" onPress={selectAllCategories} style={[styles.modalChip, styles.stableChip, styles.stableChipSize]}>Select All</Chip>
            <Chip mode="outlined" onPress={clearCategories} style={[styles.modalChip, styles.stableChip, styles.stableChipSize]}>Clear</Chip>
          </View>

          <View style={styles.modalChipRow}>
            {CATEGORY_OPTIONS.map((c) => {
              const isSel = selectedCategories.includes(c);
              return (
                <Chip
                  key={c}
                  onPress={() => toggleCategory(c)}
                  mode="outlined"
                  compact
                  style={[
                    styles.modalChip,
                    styles.stableChip,
                    styles.stableChipSize,
                    {
                      borderColor: isSel ? GREEN : "#AAA",
                      backgroundColor: isSel ? "rgba(76,175,80,0.12)" : "rgba(0,0,0,0.04)" // green tint vs neutral
                    }
                  ]}
                >
                  {c}
                </Chip>
              );
            })}
          </View>
          <Button mode="contained" onPress={toggleTypeModal} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>

        {/* Dates (single-select) */}
        <Modal
          visible={dateOpen}
          onDismiss={toggleDateModal}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Upcoming Dates</Text>
          <View style={styles.modalChipRow}>
            {(["Any", "30d", "90d"] as DateFilter[]).map((d) => {
              const isSel = dateFilter === d;
              return (
                <Chip
                  key={d}
                  onPress={() => setDateFilter(d)}
                  mode="outlined"
                  compact
                  style={[
                    styles.modalChip,
                    styles.stableChip,
                    styles.stableChipSize,
                    {
                      borderColor: isSel ? GREEN : "#AAA",
                      backgroundColor: isSel ? "rgba(76,175,80,0.12)" : "rgba(0,0,0,0.04)"
                    }
                  ]}
                >
                  {d === "Any" ? "Any date" : d === "30d" ? "Next 30 days" : "Next 90 days"}
                </Chip>
              );
            })}
          </View>
          <Button mode="contained" onPress={toggleDateModal} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>

        {/* Location (text) */}
        <Modal
          visible={locOpen}
          onDismiss={toggleLocationModal}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Location</Text>
          <TextInput mode="outlined" placeholder="City or country…" value={locationText} onChangeText={setLocationText} />
          <Button mode="contained" onPress={toggleLocationModal} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>

        {/* Distance (multi-select) */}
        <Modal
          visible={distOpen}
          onDismiss={toggleDistanceModal}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Distance</Text>

          <View style={[styles.modalChipRow, { marginBottom: 8 }]}>
            <Chip
              mode="outlined"
              compact
              onPress={selectAllDistances}
              style={[styles.modalChip, styles.stableChip, styles.stableChipSize]}
            >
              Select All
            </Chip>
            <Chip
              mode="outlined"
              compact
              onPress={clearDistances}
              style={[styles.modalChip, styles.stableChip, styles.stableChipSize]}
            >
              Clear
            </Chip>
          </View>

          <View style={styles.modalChipRow}>
            {DISTANCE_OPTIONS.map((d) => {
              const isSel = selectedDistances.includes(d);
              return (
                <Chip
                  key={d}
                  onPress={() => toggleDistance(d)}
                  mode="outlined"
                  compact
                  style={[
                    styles.modalChip,
                    styles.stableChip,
                    styles.stableChipSize,
                    {
                      borderColor: isSel ? GREEN : "#AAA",
                      backgroundColor: isSel ? "rgba(76,175,80,0.12)" : "rgba(0,0,0,0.04)"
                    }
                  ]}
                >
                  {d === "<=5" ? t('distanceLe5') : d === "5-10" ? t('distance5to10') : t('distanceGt10')}
                </Chip>
              );
            })}
          </View>
          <Button mode="contained" onPress={toggleDistanceModal} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  headerWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  headerTitle: { flex: 1, textAlign: "center" },
  headerActions: {
    position: "absolute",
    right: H_PADDING,
    flexDirection: "row",
    alignItems: "center"
  },

  // Filters block
  filtersWrap: { paddingHorizontal: H_PADDING, paddingTop: 8, paddingBottom: 12 },
  filtersTitle: { marginBottom: 8 },

  // Fixed-size pills in a 2-column responsive grid
  filtersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    justifyContent: "flex-start"
  },
  pill: {
    width: PILL_WIDTH,              // fixed → no jump when text grows
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)"
  },

  filtersBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  resetRow: { flexDirection: "row", alignItems: "center" },
  mapPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1
  },

  // Cards
  card: { 
    borderRadius: 12, 
    marginHorizontal: H_PADDING, 
    elevation: 1,
    overflow: 'hidden'
  },
  cardCover: {
    aspectRatio: 16 / 9,
  },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tagChip: { borderWidth: 1 },

  // FAB
  fab: { position: "absolute", right: H_PADDING, bottom: 24, elevation: 4 },
  mapActionsContainer: { position: "absolute", right: H_PADDING, bottom: 24, gap: 12 },
  mapFiltersFab: { elevation: 4 },
  mapActionFab: { elevation: 4 },
  mapFilterStatus: { 
    position: "absolute", 
    top: 16, 
    left: H_PADDING, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 16, 
    elevation: 2 
  },

  // Modals
  sheet: { marginHorizontal: H_PADDING, padding: 16, borderRadius: 16 },
  modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalChip: { marginRight: 8, marginBottom: 8 },

  // 🔒 Stable chip sizing to prevent modal reflow when selected
  stableChip: {
    minWidth: 110,
    alignSelf: "flex-start",
    justifyContent: "center"
  },
  stableChipSize: {
    height: 36,
    paddingHorizontal: 10
  },

  center: { alignItems: "center", justifyContent: "center" },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: H_PADDING,
    paddingVertical: 32
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.7
  },
  emptyButton: {
    marginTop: 8
  }
});