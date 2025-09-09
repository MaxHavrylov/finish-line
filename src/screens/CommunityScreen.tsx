import React from "react";
import { View, FlatList, Image, StyleSheet } from "react-native";
import { Card, Text, Button, Chip, Avatar, Divider } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

// --- Types ---
type FriendActivity = {
  id: string;
  name: string;
  avatar: string;
  text: string;
  timeAgo: string;
};

type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  status: "Upcoming" | "Open" | "Closed";
  friendsJoining: number;
  friendAvatars: string[];
  image?: string;
};

// --- Mock data (replace later with API) ---
const activities: FriendActivity[] = [
  {
    id: "f1",
    name: "Jane Doe",
    avatar: "https://i.pravatar.cc/100?img=5",
    text: "completed a 5K run",
    timeAgo: "2 hours ago"
  },
  {
    id: "f2",
    name: "John Smith",
    avatar: "https://i.pravatar.cc/100?img=15",
    text: "finished a sprint triathlon",
    timeAgo: "1 day ago"
  }
];

const friendEvents: Event[] = [
  {
    id: "e1",
    title: "City Marathon 2024",
    date: "Oct 26, 2024",
    location: "Central Park, NYC",
    status: "Upcoming",
    friendsJoining: 3,
    friendAvatars: [
      "https://i.pravatar.cc/100?img=1",
      "https://i.pravatar.cc/100?img=2",
      "https://i.pravatar.cc/100?img=3"
    ],
    image: "https://picsum.photos/600/300?mar"
  },
  {
    id: "e2",
    title: "Triathlon Challenge",
    date: "Nov 15, 2024",
    location: "Lake Tahoe, CA",
    status: "Upcoming",
    friendsJoining: 1,
    friendAvatars: ["https://i.pravatar.cc/100?img=12"],
    image: "https://picsum.photos/600/300?tri"
  }
];

export default function CommunityScreen() {
  const navigation = useNavigation<any>();

  return (
    <FlatList
      style={styles.container}
      ListHeaderComponent={
        <View>
          {/* Friend Activity */}
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Friend Activity
          </Text>
          <FlatList
            data={activities}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            renderItem={({ item }) => (
              <Card style={styles.activityCard}>
                <Card.Content style={styles.activityRow}>
                  <Avatar.Image size={48} source={{ uri: item.avatar }} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text variant="titleSmall">{item.name}</Text>
                    <Text style={styles.dim}>{item.text}</Text>
                    <Text style={styles.dim}>{item.timeAgo}</Text>
                  </View>
                </Card.Content>
              </Card>
            )}
          />

          {/* Upcoming with Friends */}
          <Text variant="titleLarge" style={[styles.sectionTitle, { marginTop: 16 }]}>
            Upcoming Events with Friends
          </Text>
        </View>
      }
      data={friendEvents}
      keyExtractor={(i) => i.id}
      ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
      renderItem={({ item }) => {
        // ✅ Build the payload inline (no hooks in helpers)
        const navEvent = {
          id: item.id,
          title: item.title,
          date: item.date,
          location: item.location,
          category: "Community",
          distance: "",
          image: item.image ?? "https://picsum.photos/600/300?comm"
        };

        return (
          <Card
            style={styles.eventCard}
            onPress={() => navigation.navigate("EventDetails", { event: navEvent })}
          >
            {item.image && <Card.Cover source={{ uri: item.image }} />}
            <Card.Title
              title={item.title}
              subtitle={`${item.date}  •  ${item.location}`}
              right={() => (
                <Chip compact style={styles.statusChip}>
                  {item.status}
                </Chip>
              )}
            />
            <Card.Content>
              <View style={styles.friendsRow}>
                <View style={styles.avatarsStack}>
                  {item.friendAvatars.slice(0, 3).map((uri, idx) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={[styles.smallAvatar, { left: idx * 18 }]}
                    />
                  ))}
                </View>
                <Text style={styles.dim}>
                  {item.friendsJoining} {item.friendsJoining === 1 ? "friend" : "friends"} joining
                </Text>
              </View>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate("EventDetails", { event: navEvent })}
              >
                View Details
              </Button>
            </Card.Actions>
          </Card>
        );
      }}
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { marginBottom: 8 },
  dim: { opacity: 0.7 },
  activityCard: { borderRadius: 16, marginRight: 12, width: 260 },
  activityRow: { flexDirection: "row", alignItems: "center" },
  eventCard: { borderRadius: 16 },
  statusChip: { marginRight: 12, alignSelf: "center" },
  friendsRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  avatarsStack: { height: 28, width: 80 },
  smallAvatar: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fff"
  }
});