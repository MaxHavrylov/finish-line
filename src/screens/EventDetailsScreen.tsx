import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { Card, Text, Button, Divider, Chip, ActivityIndicator, useTheme } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { EventDetails } from "@/types/events";
import { getEventById } from "@/repositories/eventsRepo";
import { isFavorite, toggleFavorite } from "@/repositories/favoritesRepo";
import { buildICS, saveAndShareICS } from '@/utils/calendar';

type EventParam = {
  event: { id: string; title: string; date: string; location: string; category: string; distance: string; image?: string };
  favoriteChanged?: boolean;
};

export default function EventDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { event } = route.params as EventParam;
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [fav, setFav] = useState<boolean>(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const d = await getEventById(event.id);
      if (mounted.current && d) setDetails(d);
      const f = await isFavorite(event.id);
      if (mounted.current) setFav(f);
    })();
    return () => { mounted.current = false; };
  }, [event.id]);

  const onToggleFav = useCallback(async () => {
    const now = await toggleFavorite(event.id);
    if (mounted.current) setFav(now);
    // Notify previous screen to refresh favorites
    if (navigation && navigation.setParams) {
      navigation.setParams({ ...route.params, favoriteChanged: true });
      console.log('Set favoriteChanged param via navigation.setParams');
    } else {
      console.warn('Could not set favoriteChanged param');
    }
  }, [event.id, navigation, route.params]);

  // --- ACTIONS ---
  const handleOpenInMaps = useCallback(() => {
    if (details && details.lat && details.lng) {
      const lat = details.lat;
      const lng = details.lng;
      const label = encodeURIComponent(event.title);
      let url = '';
      if (Platform.OS === 'ios') {
        url = `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
      } else if (Platform.OS === 'android') {
        url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      }
      Linking.openURL(url);
    } else {
      // Fallback: search by title/location
      const query = encodeURIComponent(`${event.title} ${event.location}`);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  }, [details, event]);

  const handleAddToCalendar = useCallback(async () => {
    if (!details) return;
    setCalendarLoading(true);
    try {
      // Derive start/end: use event.date (ISO) as base
      const date = new Date(event.date);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const ics = buildICS({
        id: event.id,
        title: event.title,
        location: event.location,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        description: undefined,
        url: undefined
      });
      await saveAndShareICS(ics, `${event.id}.ics`);
    } finally {
      setCalendarLoading(false);
    }
  }, [details, event]);

  const lat = details?.lat ?? 53.7168;
  const lng = details?.lng ?? -6.3533;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        {event.image && <Card.Cover source={{ uri: event.image }} />}
        <Card.Title
          title={event.title}
          subtitle={event.location}
          right={() => (
            <Pressable onPress={onToggleFav} hitSlop={8} style={({ pressed }) => [{ paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.7 : 1 }]}> 
              <Ionicons
                name={fav ? "heart" : "heart-outline"}
                size={22}
                color={fav ? theme.colors.error : theme.colors.onSurface}
              />
            </Pressable>
          )}
        />
        <Card.Content>
          <Text>Date: {new Date(event.date).toLocaleString()}</Text>
          <Text>Category: {event.category}</Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text variant="titleMedium">Available Distances</Text>
          <View style={styles.row}>
            {!details ? (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            ) : details.distances.length === 0 ? (
              <Text style={{ opacity: 0.7 }}>No distances listed</Text>
            ) : (
              details.distances.map((d) => (
                <Chip key={d.id} style={styles.chip}>
                  {d.label}
                </Chip>
              ))
            )}
          </View>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained">Register Now</Button>
          <Button onPress={handleOpenInMaps} icon="map-outline">Open in Maps</Button>
          <Button onPress={handleAddToCalendar} icon="calendar-plus" disabled={calendarLoading}>
            {calendarLoading ? <ActivityIndicator size={16} style={{ marginRight: 8 }} /> : null}
            Add to Calendar
          </Button>
        </Card.Actions>
      </Card>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} title={event.title} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16, borderRadius: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { marginRight: 8, marginBottom: 8 },
  map: { flex: 1, margin: 16, borderRadius: 16 }
});