import React, { useState } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function MyRacesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'future' | 'past'>('future');
  
  // Responsive layout threshold
  const isNarrow = width < 600;

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {activeTab === 'future' ? t('myRacesNoFutureRaces') : t('myRacesNoPastRaces')}
      </Text>
    </View>
  );

  return (
    <View style={[
      styles.container,
      { flexDirection: isNarrow ? 'column' : 'row' }
    ]}>
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
          accessibilityLabel={t('myRacesFuture')}
          style={styles.tabButton}
        >
          {t('myRacesFuture')}
        </Button>
        <Button
          mode={activeTab === 'past' ? 'contained' : 'text'}
          onPress={() => setActiveTab('past')}
          testID="tab-past"
          accessibilityLabel={t('myRacesPast')}
          style={styles.tabButton}
        >
          {t('myRacesPast')}
        </Button>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          testID={activeTab === 'future' ? 'list-future' : 'list-past'}
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
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
    flexGrow: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  emptyText: {
    opacity: 0.7
  }
});
