import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Button, Divider, Chip } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";

export default function EventDetailsScreen({ route }: any) {
  const { event } = route.params;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Cover source={{ uri: event.image }} />
        <Card.Title title={event.title} subtitle={event.location} />
        <Card.Content>
          <Text>Date: {event.date}</Text>
          <Text>Category: {event.category}</Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text variant="titleMedium">Available Distances</Text>
          <View style={styles.row}>
            <Chip style={styles.chip}>5 km</Chip>
            <Chip style={styles.chip}>10 km</Chip>
            <Chip style={styles.chip}>Relay</Chip>
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
          latitude: 53.7168,
          longitude: -6.3533,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        <Marker
          coordinate={{ latitude: 53.7168, longitude: -6.3533 }}
          title={event.title}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16, borderRadius: 16 },
  row: { flexDirection: "row", marginTop: 8 },
  chip: { marginRight: 8 },
  map: { flex: 1, margin: 16, borderRadius: 16 }
});