import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
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
    },
  }),
}));

describe('EventDetailsScreen Provider Block', () => {
  const mockNavigation = {
    setParams: jest.fn(),
  };

  const mockRoute = {
    params: {
      event: {
        id: 'event-1',
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

  it('renders provider block when providersRepo returns a provider', async () => {
    // Mock the providersRepo to return a provider
    const mockProvider = {
      id: 'spartan',
      name: 'Spartan Race',
      logoUrl: '',
      website: 'https://www.spartan.com'
    };

    const { getEventById } = require('../../repositories/eventsRepo');
    const { isFavorite } = require('../../repositories/favoritesRepo');
    const { getByEventId } = require('../../repositories/userRacesRepo');
    const { providersRepo } = require('../../repositories/providersRepo');

    getEventById.mockResolvedValue({
      id: 'event-1',
      distances: [],
    });
    isFavorite.mockResolvedValue(false);
    getByEventId.mockResolvedValue(null);
    providersRepo.getProviderByEventId.mockResolvedValue(mockProvider);

    render(
      <PaperProvider>
        <EventDetailsScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      </PaperProvider>
    );

    // Wait for the provider data to load
    await waitFor(() => {
      expect(screen.getByTestId('provider-block')).toBeTruthy();
    }, { timeout: 3000 });

    // Check that the provider name is displayed
    expect(screen.getByText('Spartan Race')).toBeTruthy();

    // Check that the website button is present
    expect(screen.getByTestId('btn-provider-website')).toBeTruthy();
  });
});