import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import DiscoverScreen from '../DiscoverScreen';

// Mock all the dependencies
jest.mock('../../repositories/eventsRepo');
jest.mock('../../repositories/favoritesRepo');
jest.mock('../../sync/eventsSync');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
  useRoute: () => ({
    params: {},
  }),
}));
jest.mock('react-native-paper', () => ({
  ...jest.requireActual('react-native-paper'),
  useTheme: () => ({
    colors: {
      primary: '#000',
      onSurface: '#000',
      error: '#f00',
      secondaryContainer: '#eee',
      elevation: { level1: '#f5f5f5' },
      outline: '#ccc',
      onPrimary: '#fff',
    },
  }),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('DiscoverScreen Provider Chip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows provider chip on event cards when summaries include providerName', async () => {
    // Mock getEvents to return an event with providerName
    const mockEvent = {
      id: 'e1',
      title: 'Test Event',
      startDate: '2025-10-10T10:00:00Z',
      city: 'Prague',
      country: 'Czech Republic',
      eventCategory: 'OCR' as const,
      status: 'scheduled' as const,
      minDistanceLabel: '10 km',
      providerName: 'Spartan Race',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const { getEvents, seedMockIfEmpty } = require('../../repositories/eventsRepo');
    const { listFavoriteIds } = require('../../repositories/favoritesRepo');
    const { syncEvents } = require('../../sync/eventsSync');

    getEvents.mockResolvedValue([mockEvent]);
    seedMockIfEmpty.mockResolvedValue();
    listFavoriteIds.mockResolvedValue(new Set());
    syncEvents.mockResolvedValue();

    render(
      <NavigationContainer>
        <PaperProvider>
          <DiscoverScreen />
        </PaperProvider>
      </NavigationContainer>
    );

    // Wait for the events to load and render
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeTruthy();
    });

    // Check that the provider chip is present with correct text
    expect(screen.getByTestId('chip-provider')).toBeTruthy();
    expect(screen.getByText('Spartan Race')).toBeTruthy();
  });
});