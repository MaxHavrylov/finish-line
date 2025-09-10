import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Button, Divider, Chip, ActivityIndicator } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import { EventDetails } from "@/types/events";
import { getEventById } from "@/repositories/eventsRepo";

export default function EventDetailsScreen({ route }: any) {
  const { event } = route.params as {
    event: { id: string; title: string; date: string; location: string; category: string; distance: string; image?: string };
  };

  const [details, setDetails] = useState<EventDetails | null>(null);

  useEffect(() => {
    (async () => {
      const d = await getEventById(event.id);
      if (d) setDetails(d);
    })();
  }, [event.id]);

  const lat = details?.lat ?? 53.7168;
  const lng = details?.lng ?? -6.3533;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        {event.image && <Card.Cover source={{ uri: event.image }} />}
        <Card.Title title={event.title} subtitle={event.location} />
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
          <Button>Add to Calendar</Button>
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