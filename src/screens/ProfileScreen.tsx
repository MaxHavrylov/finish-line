import React from "react";
import { View, StyleSheet } from "react-native";
import { Avatar, Text, Card, Button, Divider } from "react-native-paper";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Title
          title="Jan Novák"
          subtitle="Brno, Czech Republic"
          left={(props) => (
            <Avatar.Image
              {...props}
              source={{ uri: "https://picsum.photos/100" }}
            />
          )}
        />
        <Card.Content>
          <Text variant="titleMedium">17 Total Races</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Connected Apps" />
        <Card.Actions>
          <Button mode="contained">Strava</Button>
          <Button mode="outlined">Garmin</Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Past Race Results" />
        <Divider />
        <Card.Content>
          <Text>Spartan Race Sprint — Oct 28, 2023</Text>
          <Text>01:15:23, Rank 12/250, Distance: 5 km</Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text>Prague Marathon — May 7, 2023</Text>
          <Text>03:45:10, Rank 87/1200, Distance: 42.2 km</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  profileCard: { borderRadius: 16, marginBottom: 16 },
  card: { borderRadius: 16, marginBottom: 16 }
});