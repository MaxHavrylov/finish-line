import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Dimensions
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
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { EventSummary, EventCategory } from "../types/events";
import { seedMockIfEmpty, getEvents } from "../repositories/eventsRepo";
import { syncEvents } from "../sync/eventsSync";
import { isWithinDays } from "../utils/date";

// ---- Config / constants
type DateFilter = "Any" | "30d" | "90d";
type DistanceOption = "<=5" | "5-10" | ">10";

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

// ---- Layout numbers for fixed pill width (2 columns)
const SCREEN = Dimensions.get("window");
const H_PADDING = 16; // filtersWrap horizontal padding
const GAP = 12;       // space between pills
const COLUMNS = 2;
const PILL_WIDTH = Math.floor((SCREEN.width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

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
        pressed && { opacity: 0.85 } // no scale to avoid visual jump
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={theme.colors.onSurface}
        style={{ marginRight: 8 }}
      />
      <Text numberOfLines={1} style={{ opacity: 0.9, textAlign: "center", flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const listRef = useRef<FlatList>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToTop, setShowToTop] = useState(false);

  const [events, setEvents] = useState<EventSummary[]>([]);

  // ---- filters
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("Any");
  const [locationText, setLocationText] = useState<string>("");

  // distance (multi-select)
  const [selectedDistances, setSelectedDistances] = useState<DistanceOption[]>([]);

  // ---- filter modals
  const [typeOpen, setTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await getEvents();
    setEvents(data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await seedMockIfEmpty();
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncEvents();
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // helper for distance matching
  const matchesAnySelectedDistance = (label?: string): boolean => {
    if (selectedDistances.length === 0) return true; // "Any"
    const d = parseDistanceKm(label);
    if (d == null) return false;
    return selectedDistances.some((opt) => {
      switch (opt) {
        case "<=5":
          return d <= 5;
        case "5-10":
          return d >= 5 && d <= 10;
        case ">10":
          return d > 10;
      }
    });
  };

  const filtered = useMemo(() => {
    return events.filter((e) => {
      // Types (OR within categories)
      if (selectedCategories.length > 0 && !selectedCategories.includes(e.eventCategory)) {
        return false;
      }
      if (dateFilter === "30d" && !isWithinDays(e.startDate, 30)) return false;
      if (dateFilter === "90d" && !isWithinDays(e.startDate, 90)) return false;

      if (locationText.trim()) {
        const hay = `${e.city ?? ""} ${e.country ?? ""}`.toLowerCase();
        if (!hay.includes(locationText.trim().toLowerCase())) return false;
      }

      // distances (multi-select)
      if (!matchesAnySelectedDistance(e.minDistanceLabel)) return false;

      return true;
    });
  }, [events, selectedCategories, dateFilter, locationText, selectedDistances]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowToTop(e.nativeEvent.contentOffset.y > 400);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setDateFilter("Any");
    setLocationText("");
    setSelectedDistances([]);
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

  // labels with counts
  const typesLabel =
    selectedCategories.length > 0
      ? `Race Types (${selectedCategories.length})`
      : "Race Types";

  const datesLabel =
    dateFilter === "Any" ? "Upcoming Dates" : "Upcoming Dates (1)";

  const locationLabel =
    locationText.trim().length > 0 ? "Location (1)" : "Location";

  const distanceLabel =
    selectedDistances.length > 0 ? `Distance (${selectedDistances.length})` : "Distance";

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, padding: 16 }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading events…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={dataWithFilters}
        keyExtractor={(item, index) =>
          ("__type" in item ? "__filters" : item.id) + "-" + index
        }
        ListHeaderComponent={
          <View
            style={[
              styles.headerWrap,
              { backgroundColor: theme.colors.background }
            ]}
          >
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Discover
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                hitSlop={8}
                onPress={() => {}}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.onSurface}
                  style={{ marginRight: 14 }}
                />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => navigation.navigate("Profile")}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={26}
                  color={theme.colors.onSurface}
                />
              </Pressable>
            </View>
          </View>
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
          if ("__type" in item) {
            return (
              <View style={styles.filtersWrap}>
                <Text variant="titleMedium" style={styles.filtersTitle}>
                  Filter Events
                </Text>

                <View style={styles.filtersGrid}>
                  <FilterPill icon="pulse-outline" label={typesLabel} onPress={() => setTypeOpen(true)} />
                  <FilterPill icon="calendar-outline" label={datesLabel} onPress={() => setDateOpen(true)} />
                  <FilterPill icon="location-outline" label={locationLabel} onPress={() => setLocOpen(true)} />
                  <FilterPill icon="swap-vertical-outline" label={distanceLabel} onPress={() => setDistOpen(true)} />
                </View>

                <View style={styles.filtersBottomRow}>
                  <Pressable
                    onPress={resetFilters}
                    style={({ pressed }) => [styles.resetRow, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="filter-outline" size={16} color={GREEN} />
                    <Text style={[styles.resetText, { color: GREEN }]}>Reset Filters</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => [
                      styles.mapPill,
                      { borderColor: theme.colors.outline },
                      pressed && { opacity: 0.85 }
                    ]}
                  >
                    <Ionicons
                      name="map-outline"
                      size={16}
                      color={theme.colors.onSurface}
                      style={{ marginRight: 6 }}
                    />
                    <Text>Show Map</Text>
                  </Pressable>
                </View>

                <View style={{ height: 8 }} />
              </View>
            );
          }

          const e = item as EventSummary;
          const categoryColor = CATEGORY_COLORS[e.eventCategory] ?? GREEN;

          return (
            <Card
              style={styles.card}
              onPress={() =>
                navigation.navigate("EventDetails", {
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
              {e.coverImage && <Card.Cover source={{ uri: e.coverImage }} />}
              <Card.Title title={e.title} subtitle={new Date(e.startDate).toDateString()} />
              <Card.Content>
                {!!(e.city || e.country) && (
                  <Text style={{ marginBottom: 8 }}>
                    {[e.city, e.country].filter(Boolean).join(", ")}
                  </Text>
                )}
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Chip
                    style={[styles.tagChip, { backgroundColor: categoryColor + "22", borderColor: categoryColor }]}
                    textStyle={{ color: categoryColor, fontWeight: "600" }}
                    mode="outlined"
                  >
                    {e.eventCategory}
                  </Chip>
                  {e.minDistanceLabel ? (
                    <Chip
                      style={[styles.tagChip, { backgroundColor: theme.colors.elevation.level1 }]}
                      textStyle={{ fontWeight: "600" }}
                    >
                      {e.minDistanceLabel}
                    </Chip>
                  ) : null}
                </View>
              </Card.Content>
            </Card>
          );
        }}
        ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {showToTop && (
        <FAB
          icon="arrow-up"
          onPress={scrollToTop}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
        />
      )}

      {/* Filter Modals */}
      <Portal>
        {/* Race Types (multi-select) */}
        <Modal
          visible={typeOpen}
          onDismiss={() => setTypeOpen(false)}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Race Types</Text>

          <View style={[styles.modalChipRow, { marginBottom: 8 }]}>
            <Chip mode="outlined" onPress={selectAllCategories} style={styles.modalChip}>Select All</Chip>
            <Chip mode="outlined" onPress={clearCategories} style={styles.modalChip}>Clear</Chip>
          </View>

          <View style={styles.modalChipRow}>
            {CATEGORY_OPTIONS.map((c) => {
              const color = CATEGORY_COLORS[c] ?? GREEN;
              const isSel = selectedCategories.includes(c);
              return (
                <Chip
                  key={c}
                  selected={isSel}
                  onPress={() => toggleCategory(c)}
                  mode="outlined"
                  style={[
                    styles.modalChip,
                    {
                      // Same approach you use on cards: colored border + subtle fill
                      borderColor: color,
                      backgroundColor: isSel ? `${color}22` : `${color}14`
                    }
                  ]}
                  textStyle={{ color, fontWeight: "600" }}
                >
                  {c}
                </Chip>
              );
            })}
          </View>
          <Button mode="contained" onPress={() => setTypeOpen(false)} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>

        {/* Dates (single-select) */}
        <Modal
          visible={dateOpen}
          onDismiss={() => setDateOpen(false)}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Upcoming Dates</Text>
          <View style={styles.modalChipRow}>
            {(["Any", "30d", "90d"] as DateFilter[]).map((d) => (
              <Chip key={d} selected={dateFilter === d} onPress={() => setDateFilter(d)} style={styles.modalChip}>
                {d === "Any" ? "Any date" : d === "30d" ? "Next 30 days" : "Next 90 days"}
              </Chip>
            ))}
          </View>
          <Button mode="contained" onPress={() => setDateOpen(false)} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>

        {/* Location (text) */}
        <Modal
          visible={locOpen}
          onDismiss={() => setLocOpen(false)}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Location</Text>
          <TextInput mode="outlined" placeholder="City or country…" value={locationText} onChangeText={setLocationText} />
          <Button mode="contained" onPress={() => setLocOpen(false)} style={{ marginTop: 12 }}>
            Apply
          </Button>
        </Modal>

        {/* Distance (multi-select) */}
        <Modal
          visible={distOpen}
          onDismiss={() => setDistOpen(false)}
          contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Distance</Text>

          <View style={[styles.modalChipRow, { marginBottom: 8 }]}>
            <Chip mode="outlined" onPress={selectAllDistances} style={styles.modalChip}>Select All</Chip>
            <Chip mode="outlined" onPress={clearDistances} style={styles.modalChip}>Clear</Chip>
          </View>

          <View style={styles.modalChipRow}>
            {DISTANCE_OPTIONS.map((d) => (
              <Chip
                key={d}
                selected={selectedDistances.includes(d)}
                onPress={() => toggleDistance(d)}
                style={styles.modalChip}
              >
                {d === "<=5" ? "≤ 5 km" : d === "5-10" ? "5–10 km" : "> 10 km"}
              </Chip>
            ))}
          </View>

          <Button mode="contained" onPress={() => setDistOpen(false)} style={{ marginTop: 12 }}>
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
  headerTitle: { fontWeight: "700", flex: 1, textAlign: "center" },
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
    width: PILL_WIDTH,
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
  resetText: { marginLeft: 6, fontWeight: "600" },
  mapPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1
  },

  // Cards
  card: { borderRadius: 16, marginHorizontal: H_PADDING },
  row: { flexDirection: "row", alignItems: "center" },
  tagChip: { marginRight: 8, borderWidth: 1 },

  // FAB
  fab: { position: "absolute", right: H_PADDING, bottom: 24, elevation: 4 },

  // Modals
  sheet: { marginHorizontal: H_PADDING, padding: 16, borderRadius: 16 },
  modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalChip: { marginRight: 8, marginBottom: 8 },

  center: { alignItems: "center", justifyContent: "center" }
});