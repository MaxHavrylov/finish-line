import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import EventDetailsScreen from '../EventDetailsScreen';

// Mock all the dependencies
jest.mock('../../repositories/eventsRepo');
jest.mock('../../repositories/favoritesRepo');
jest.mock('../../repositories/userRacesRepo');
jest.mock('../../repositories/providersRepo');
jest.mock('../../utils/calendar');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
}));
jest.mock('react-native-paper', () => ({
  ...jest.requireActual('react-native-paper'),
  useTheme: () => ({
    colors: {
      primary: '#000',
      onSurface: '#000',
      error: '#f00',
      surface: '#fff',
    },
  }),
}));

describe('EventDetailsScreen My Races Flow', () => {
  const mockNavigation = {
    setParams: jest.fn(),
  };

  const mockRoute = {
    params: {
      event: {
        id: 'e1',
        title: 'Test Event',
        date: '2023-12-25T10:00:00Z',
        location: 'Test City',
        category: 'Marathon',
        distance: '42.2 km',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles "I\'m going" to "Manage" flow', async () => {
    const { getEventById } = require('../../repositories/eventsRepo');
    const { isFavorite } = require('../../repositories/favoritesRepo');
    const { getByEventId, saveFutureRace } = require('../../repositories/userRacesRepo');
    const { providersRepo } = require('../../repositories/providersRepo');

    // Initial mocks
    getEventById.mockResolvedValue({
      id: 'e1',
      distances: [],
    });
    isFavorite.mockResolvedValue(false);
    getByEventId.mockResolvedValue(null); // No race record initially
    providersRepo.getProviderByEventId.mockResolvedValue(null);
    saveFutureRace.mockResolvedValue('race-1');

    const { rerender } = render(
      <PaperProvider>
        <EventDetailsScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      </PaperProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('btn-im-going')).toBeTruthy();
    });

    // Tap "I'm going"
    fireEvent.press(screen.getByTestId('btn-im-going'));

    // Wait for the button to change to "Manage"
    await waitFor(() => {
      expect(screen.getByTestId('btn-manage')).toBeTruthy();
    });

    // Now mock getByEventId to return FUTURE status
    getByEventId.mockResolvedValue({ id: 'race-1', status: 'FUTURE' });

    // Re-render to pick up the new mock
    rerender(
      <PaperProvider>
        <EventDetailsScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      </PaperProvider>
    );

    // Wait for the component to update with the race record
    await waitFor(() => {
      expect(screen.getByTestId('btn-manage')).toBeTruthy();
    });

    // Tap "Manage" to open modal
    fireEvent.press(screen.getByTestId('btn-manage'));

    // Expect modal to be visible
    await waitFor(() => {
      expect(screen.getByTestId('modal-manage')).toBeTruthy();
    });
  });
});