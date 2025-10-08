import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { Button, Text, useTheme, Card, Chip, Portal, Modal, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as userRacesRepo from '@/repositories/userRacesRepo';
import { listFollowing } from '@/repositories/followsRepo';
import { resultsRepo, type FriendResult } from '@/repositories/resultsRepo';
import type { FutureUserRace, PastUserRace } from '@/types/events';

type PastRaceWithMeta = PastUserRace & { 
  isPR?: boolean;
  title: string;
  minDistanceLabel?: string;
  eventCategory: string;
};

export default function MyRacesScreen() {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'future' | 'past'>('future');
  
  // Data states
  const [futureRaces, setFutureRaces] = useState<Array<FutureUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  }>>([]);
  const [pastRaces, setPastRaces] = useState<PastRaceWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Result entry modal states
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedRace, setSelectedRace] = useState<(FutureUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  }) | null>(null);
  const [resultHours, setResultHours] = useState('');
  const [resultMinutes, setResultMinutes] = useState('');
  const [resultSeconds, setResultSeconds] = useState('');
  const [resultNote, setResultNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Comparison states
  const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);
  const [friendsResults, setFriendsResults] = useState<{ [eventId: string]: FriendResult[] }>({});
  const [loadingComparisons, setLoadingComparisons] = useState<{ [eventId: string]: boolean }>({});
  
  // Responsive layout threshold
  const isNarrow = width < 600;

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [future, past] = await Promise.all([
        userRacesRepo.listFuture(),
        userRacesRepo.listPastWithMeta()
      ]);
      setFutureRaces(future);
      setPastRaces(past);
    } catch (error) {
      console.warn('Failed to load races:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Result entry handlers
  const handleAddResult = useCallback((race: FutureUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  }) => {
    setSelectedRace(race);
    setResultHours('');
    setResultMinutes('');
    setResultSeconds('');
    setResultNote('');
    setResultModalVisible(true);
  }, []);

  const handleSaveResult = useCallback(async () => {
    if (!selectedRace) return;

    const hours = parseInt(resultHours) || 0;
    const minutes = parseInt(resultMinutes) || 0;
    const seconds = parseInt(resultSeconds) || 0;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds <= 0) return;

    setSaving(true);
    try {
      await userRacesRepo.addResult(selectedRace.id, totalSeconds);
      setResultModalVisible(false);
      await loadData(); // Reload to update the lists
    } catch (error) {
      console.warn('Failed to save result:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedRace, resultHours, resultMinutes, resultSeconds, loadData]);

  // Comparison functions
  const loadFriendsResults = useCallback(async (eventId: string) => {
    if (friendsResults[eventId] || loadingComparisons[eventId]) {
      return; // Already loaded or loading
    }

    setLoadingComparisons(prev => ({ ...prev, [eventId]: true }));
    
    try {
      const followingIds = await listFollowing('me');
      const results = await resultsRepo.getFriendsResults(eventId, followingIds);
      setFriendsResults(prev => ({ ...prev, [eventId]: results }));
    } catch (error) {
      console.warn('Failed to load friends results:', error);
    } finally {
      setLoadingComparisons(prev => ({ ...prev, [eventId]: false }));
    }
  }, [friendsResults, loadingComparisons]);

  const handleToggleExpand = useCallback(async (race: PastRaceWithMeta) => {
    if (expandedRaceId === race.id) {
      setExpandedRaceId(null);
    } else {
      setExpandedRaceId(race.id);
      await loadFriendsResults(race.eventId);
    }
  }, [expandedRaceId, loadFriendsResults]);

  const formatTimeDelta = useCallback((deltaSeconds: number): string => {
    const absSeconds = Math.abs(deltaSeconds);
    const sign = deltaSeconds >= 0 ? '+' : '-';
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = absSeconds % 60;
    
    if (hours > 0) {
      return `${sign}${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Utility function to format time
  const formatTime = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Render items
  const renderFutureRace = useCallback(({ item }: { item: FutureUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  } }) => (
    <Card style={styles.raceCard}>
      <Card.Content>
        <Text variant="titleMedium">{item.title || 'Unknown Event'}</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 4 }}>
          {item.minDistanceLabel && `${item.minDistanceLabel} • `}
          {item.eventCategory}
        </Text>
        {item.bibNumber && (
          <Text variant="bodySmall" style={{ marginTop: 4 }}>
            Bib: {item.bibNumber}
          </Text>
        )}
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => handleAddResult(item)}
          testID="btn-add-result"
        >
          {t('addResult')}
        </Button>
      </Card.Actions>
    </Card>
  ), [handleAddResult, t]);

  const renderPastRace = useCallback(({ item }: { item: PastRaceWithMeta }) => {
    const isExpanded = expandedRaceId === item.id;
    const eventResults = friendsResults[item.eventId] || [];
    const isLoadingComparison = loadingComparisons[item.eventId];

    return (
      <Card style={styles.raceCard}>
        <Card.Content>
          <View style={styles.pastRaceHeader}>
            <Text variant="titleMedium" style={{ flex: 1 }}>{item.title}</Text>
            {item.isPR && (
              <Chip
                mode="flat"
                textStyle={{ fontSize: 12, fontWeight: 'bold' }}
                style={[styles.prChip, { backgroundColor: theme.colors.primaryContainer }]}
                testID="chip-pr"
              >
                {t('personalRecord')}
              </Chip>
            )}
          </View>
          <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 4 }}>
            {item.minDistanceLabel && `${item.minDistanceLabel} • `}
            {item.eventCategory}
          </Text>
          {item.resultTimeSeconds && (
            <Text variant="titleSmall" style={{ marginTop: 8, color: theme.colors.primary }}>
              {t('resultTime')}: {formatTime(item.resultTimeSeconds)}
            </Text>
          )}
          {item.note && (
            <Text variant="bodySmall" style={{ marginTop: 4, fontStyle: 'italic' }}>
              {item.note}
            </Text>
          )}
        </Card.Content>

        <Card.Actions>
          <Button
            mode="text"
            onPress={() => handleToggleExpand(item)}
            icon={isExpanded ? 'chevron-up' : 'chevron-down'}
          >
            {isExpanded ? 'Hide Comparison' : 'Compare vs Friends'}
          </Button>
        </Card.Actions>

        {isExpanded && (
          <Card.Content style={styles.comparisonContainer} testID="result-compare">
            {isLoadingComparison ? (
              <View style={styles.comparisonLoading}>
                <ActivityIndicator size="small" />
                <Text variant="bodySmall" style={{ marginLeft: 8 }}>Loading comparisons...</Text>
              </View>
            ) : eventResults.length > 0 ? (
              <View>
                <Text variant="titleSmall" style={{ marginBottom: 12 }}>Friends' Results</Text>
                
                {/* Friends' times */}
                {eventResults.map((result, index) => (
                  <View key={result.userId} style={styles.friendResultRow}>
                    <Text variant="bodyMedium" style={{ flex: 1 }}>
                      {index + 1}. {result.userName}
                    </Text>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                      {formatTime(result.resultTimeSeconds)}
                    </Text>
                  </View>
                ))}

                {/* Comparison deltas */}
                {item.resultTimeSeconds && (() => {
                  const friendTimes = eventResults.map(r => r.resultTimeSeconds);
                  const comparisons = resultsRepo.calculateComparisons(item.resultTimeSeconds, friendTimes);
                  
                  return (
                    <View style={styles.deltaContainer}>
                      <Text variant="titleSmall" style={{ marginBottom: 8, marginTop: 16 }}>Your Performance</Text>
                      
                      <View style={styles.deltaRow} testID="result-delta-best">
                        <Text variant="bodyMedium">vs Best Friend:</Text>
                        <Text 
                          variant="bodyMedium" 
                          style={{ 
                            fontWeight: '600',
                            color: comparisons.vsBest <= 0 ? theme.colors.primary : theme.colors.error
                          }}
                        >
                          {formatTimeDelta(comparisons.vsBest)}
                        </Text>
                      </View>

                      <View style={styles.deltaRow} testID="result-delta-median">
                        <Text variant="bodyMedium">vs Median:</Text>
                        <Text 
                          variant="bodyMedium" 
                          style={{ 
                            fontWeight: '600',
                            color: comparisons.vsMedian <= 0 ? theme.colors.primary : theme.colors.error
                          }}
                        >
                          {formatTimeDelta(comparisons.vsMedian)}
                        </Text>
                      </View>

                      <View style={styles.deltaRow} testID="result-delta-last">
                        <Text variant="bodyMedium">vs Slowest:</Text>
                        <Text 
                          variant="bodyMedium" 
                          style={{ 
                            fontWeight: '600',
                            color: comparisons.vsLast <= 0 ? theme.colors.primary : theme.colors.error
                          }}
                        >
                          {formatTimeDelta(comparisons.vsLast)}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                No friends completed this event yet
              </Text>
            )}
          </Card.Content>
        )}
      </Card>
    );
  }, [
    expandedRaceId, 
    friendsResults, 
    loadingComparisons, 
    handleToggleExpand, 
    formatTime, 
    formatTimeDelta, 
    t, 
    theme.colors
  ]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {activeTab === 'future' ? t('emptyFuture') : t('noResultsYet')}
      </Text>
      {activeTab === 'past' && (
        <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14 }]}>
          {t('addYourFirstResult')}
        </Text>
      )}
    </View>
  );

  const renderResultModal = () => (
    <Portal>
      <Modal
        visible={resultModalVisible}
        onDismiss={() => setResultModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
        testID="modal-add-result"
      >
        <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
          {t('enterResultTitle')}
        </Text>
        
        {selectedRace && (
          <Text variant="bodyLarge" style={{ marginBottom: 24, opacity: 0.8 }}>
            {selectedRace.title}
          </Text>
        )}

        <View style={styles.timeInputRow}>
          <View style={styles.timeInputContainer}>
            <Text variant="labelMedium">{t('hours')}</Text>
            <TextInput
              mode="outlined"
              value={resultHours}
              onChangeText={setResultHours}
              keyboardType="numeric"
              placeholder="0"
              style={styles.timeInput}
            />
          </View>
          <View style={styles.timeInputContainer}>
            <Text variant="labelMedium">{t('minutes')}</Text>
            <TextInput
              mode="outlined"
              value={resultMinutes}
              onChangeText={setResultMinutes}
              keyboardType="numeric"
              placeholder="0"
              style={styles.timeInput}
            />
          </View>
          <View style={styles.timeInputContainer}>
            <Text variant="labelMedium">{t('seconds')}</Text>
            <TextInput
              mode="outlined"
              value={resultSeconds}
              onChangeText={setResultSeconds}
              keyboardType="numeric"
              placeholder="0"
              style={styles.timeInput}
            />
          </View>
        </View>

        <TextInput
          mode="outlined"
          label={t('note')}
          value={resultNote}
          onChangeText={setResultNote}
          multiline
          numberOfLines={3}
          style={{ marginBottom: 24 }}
        />

        <View style={styles.modalActions}>
          <Button
            mode="text"
            onPress={() => setResultModalVisible(false)}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button
            mode="contained"
            onPress={handleSaveResult}
            loading={saving}
            disabled={saving}
          >
            {t('saveResult')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>{t('loading')}</Text>
      </View>
    );
  }

  const currentData = activeTab === 'future' ? futureRaces : pastRaces;
  const renderItem = activeTab === 'future' ? renderFutureRace : renderPastRace;

  return (
    <View style={[
      styles.container,
      { flexDirection: isNarrow ? 'column' : 'row' }
    ]}>
      {renderResultModal()}
      
      {/* Tabs */}
      <View style={[
        styles.tabsContainer,
        {
          flexDirection: isNarrow ? 'row' : 'column',
          borderRightWidth: isNarrow ? 0 : 1,
          borderBottomWidth: isNarrow ? 1 : 0,
          borderColor: theme.colors.outlineVariant
        }
      ]}>
        <Button
          mode={activeTab === 'future' ? 'contained' : 'text'}
          onPress={() => setActiveTab('future')}
          testID="tab-future"
          accessibilityLabel={t('future')}
          style={styles.tabButton}
        >
          {t('future')}
        </Button>
        <Button
          mode={activeTab === 'past' ? 'contained' : 'text'}
          onPress={() => setActiveTab('past')}
          testID="tab-past"
          accessibilityLabel={t('past')}
          style={styles.tabButton}
        >
          {t('past')}
        </Button>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          testID={activeTab === 'future' ? 'list-future' : 'list-past'}
          data={currentData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  tabsContainer: {
    padding: 8,
    gap: 8
  },
  tabButton: {
    flex: 1
  },
  content: {
    flex: 1
  },
  listContent: {
    flexGrow: 1,
    padding: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  emptyText: {
    opacity: 0.7
  },
  raceCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2
  },
  pastRaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  prChip: {
    paddingHorizontal: 8,
    height: 28
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    maxHeight: '80%'
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  timeInputContainer: {
    flex: 1,
    gap: 4
  },
  timeInput: {
    textAlign: 'center'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12
  },
  comparisonContainer: {
    paddingTop: 0,
    marginTop: -8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  comparisonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  friendResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  deltaContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8
  },
  deltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  }
});
