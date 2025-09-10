import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Card, Chip, Text, Divider, ActivityIndicator } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { EventSummary } from "@/types/events";
import { seedMockIfEmpty, getEvents } from "@/repositories/eventsRepo";

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await seedMockIfEmpty();
        const data = await getEvents();
        setEvents(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading events…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.header}>
        Upcoming Races
      </Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() =>
              navigation.navigate("EventDetails", {
                event: {
                  id: item.id,
                  title: item.title,
                  date: item.startDate,
                  location: [item.city, item.country].filter(Boolean).join(", "),
                  category: item.eventCategory,
                  distance: item.minDistanceLabel ?? "",
                  image: item.coverImage ?? "https://picsum.photos/seed/fl/1200/600"
                }
              })
            }
          >
            {item.coverImage && <Card.Cover source={{ uri: item.coverImage }} />}
            <Card.Title title={item.title} subtitle={new Date(item.startDate).toDateString()} />
            <Card.Content>
              {!!(item.city || item.country) && (
                <Text>{[item.city, item.country].filter(Boolean).join(", ")}</Text>
              )}
              <View style={styles.row}>
                <Chip style={styles.chip}>{item.eventCategory}</Chip>
                {item.minDistanceLabel ? <Text>{item.minDistanceLabel}</Text> : null}
              </View>
            </Card.Content>
          </Card>
        )}
        ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 16 },
  card: { borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  chip: { marginRight: 8 }
});