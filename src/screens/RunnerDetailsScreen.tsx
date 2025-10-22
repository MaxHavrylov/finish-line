import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import {
  Text,
  Button,
  Card,
  Avatar,
  ActivityIndicator,
  useTheme,
  SegmentedButtons,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useRoute, useNavigation } from "@react-navigation/native";
import { navigateBackOrTo } from "@/navigation/AppNavigator";
import { mockRunners, Runner } from "@/data/mockRunners";
import * as followsRepo from "@/repositories/followsRepo";

// Generate mock events for a runner
const generateMockEvents = (runnerId: string) => {
  const now = new Date();
  const pastCount = Math.max(2, parseInt(runnerId.replace(/\D/g, "")) % 8);
  const futureCount = Math.max(1, parseInt(runnerId.replace(/\D/g, "")) % 5);
  
  const events = [];
  
  // Future events
  for (let i = 0; i < futureCount; i++) {
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + (i + 1) * 14); // Every two weeks
    
    events.push({
      id: `future-${runnerId}-${i}`,
      title: `${i === 0 ? 'Marathon' : i === 1 ? 'Half Marathon' : '10K'} ${futureDate.getFullYear()}`,
      date: futureDate.toLocaleDateString(),
      location: ["Prague", "Brno", "Vienna", "Kyiv"][i % 4],
      isFuture: true
    });
  }
  
  // Past events
  for (let i = 0; i < pastCount; i++) {
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - (i + 1) * 30); // Every month in the past
    
    events.push({
      id: `past-${runnerId}-${i}`,
      title: `${i === 0 ? '5K Fun Run' : i === 1 ? 'Trail Run' : 'Sprint Triathlon'} ${pastDate.getFullYear()}`,
      date: pastDate.toLocaleDateString(),
      location: ["Prague", "Brno", "Vienna", "Kyiv"][(i + 2) % 4],
      isFuture: false,
      result: i === 0 ? '22:15' : i === 1 ? '1:45:30' : '3:05:22'
    });
  }
  
  return events;
};

interface RouteParams {
  runnerId: string;
}

export default function RunnerDetailsScreen() {
  const theme = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation('common');
  
  const { runnerId } = route.params as RouteParams;
  
  const [runner, setRunner] = useState<Runner | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('future');

  useEffect(() => {
    const loadRunnerDetails = async () => {
      try {
        // Find runner in mock data
        const foundRunner = mockRunners.find(r => r.id === runnerId);
        if (foundRunner) {
          setRunner(foundRunner);
          
          // Generate mock events
          setEvents(generateMockEvents(runnerId));
          
          // Check if following
          const following = await followsRepo.isFollowing('me', runnerId);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error('Error loading runner details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadRunnerDetails();
  }, [runnerId]);

  // Set the header title when runner data is loaded
  useEffect(() => {
    if (runner) {
      navigation.setOptions({
        title: runner.name,
        headerRight: () => (
          <Button
            mode="contained"
            onPress={handleFollowToggle}
            loading={followLoading}
            disabled={followLoading}
            style={styles.followButton}
            testID="btn-follow"
            accessibilityLabel={isFollowing ? t('unfollow') : t('follow')}
          >
            {isFollowing ? t('unfollow') : t('follow')}
          </Button>
        )
      });
    }
  }, [runner, isFollowing, followLoading, navigation]);

  const handleFollowToggle = useCallback(async () => {
    if (!runner) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followsRepo.unfollow('me', runnerId);
      } else {
        await followsRepo.follow('me', runnerId);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow status:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [isFollowing, runnerId, runner]);

  const filteredEvents = events.filter(event => 
    (activeTab === 'future' && event.isFuture) || 
    (activeTab === 'past' && !event.isFuture)
  );

  const futureCount = events.filter(event => event.isFuture).length;
  const pastCount = events.filter(event => !event.isFuture).length;

  const renderEventItem = ({ item }: { item: any }) => (
    <Card style={styles.eventCard} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium">{item.title}</Text>
        <Text variant="bodyMedium">{item.date}</Text>
        <Text variant="bodyMedium">{item.location}</Text>
        {!item.isFuture && item.result && (
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
            Result: {item.result}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!runner) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Runner not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {/* Runner info */}
          <Text variant="bodyLarge" style={styles.location}>
            {t('location')}: {runner.location}
          </Text>
          
          {runner.stats && (
            <View style={styles.stats}>
              <Text variant="bodyMedium">
                {t('races')}: {runner.stats.races} • {t('prs')}: {runner.stats.prs}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          {
            value: 'future',
            label: `${t('future')} (${futureCount})`,
            accessibilityLabel: `${t('future')} ${futureCount}`
          },
          {
            value: 'past',
            label: `${t('past')} (${pastCount})`,
            accessibilityLabel: `${t('past')} ${pastCount}`
          }
        ]}
        style={styles.tabs}
      />

      {/* Event List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text>{t('emptyList')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  profileSection: {
    marginBottom: 16,
  },
  location: {
    marginTop: 4,
    opacity: 0.7,
  },
  stats: {
    marginTop: 8,
    flexDirection: 'row',
  },
  followButton: {
    marginRight: 8,
  },
  tabs: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  eventCard: {
    marginBottom: 12,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
});
