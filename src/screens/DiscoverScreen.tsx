import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Card, Chip, Text, Button, Avatar, Divider } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  distance: string;
  image: string;
};

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Forest Challenge OCR Race",
    date: "Aug 10, 2024",
    location: "Brno, Czech Republic",
    category: "OCR Race",
    distance: "10K Elit, 5K Open",
    image: "https://picsum.photos/600/300?1"
  },
  {
    id: "2",
    title: "Prague Marathon 2024",
    date: "Sep 22, 2024",
    location: "Prague, Czech Republic",
    category: "Marathon",
    distance: "Full Marathon, Half Marathon",
    image: "https://picsum.photos/600/300?2"
  },
  {
    id: "3",
    title: "Ironman Ukraine Triathlon",
    date: "Oct 5, 2024",
    location: "Kyiv, Ukraine",
    category: "Triathlon",
    distance: "Ironman 70.3",
    image: "https://picsum.photos/600/300?3"
  }
];

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.header}>
        Upcoming Races
      </Text>
      <FlatList
        data={mockEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate("EventDetails", { event: item })}
          >
            <Card.Cover source={{ uri: item.image }} />
            <Card.Title title={item.title} subtitle={item.date} />
            <Card.Content>
              <Text>{item.location}</Text>
              <View style={styles.row}>
                <Chip style={styles.chip}>{item.category}</Chip>
                <Text>{item.distance}</Text>
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
  header: { marginBottom: 16 },
  card: { borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  chip: { marginRight: 8 }
});