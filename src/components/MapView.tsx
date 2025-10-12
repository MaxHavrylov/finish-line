import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Text, useTheme } from 'react-native-paper';
import type { EventSummary } from '@/types/events';

interface DiscoverMapViewProps {
  events: EventSummary[];
  onMarkerPress: (event: EventSummary) => void;
  loading?: boolean;
  testID?: string;
}

export default function DiscoverMapView({ 
  events, 
  onMarkerPress, 
  loading = false,
  testID = "discover-map" 
}: DiscoverMapViewProps) {
  const theme = useTheme();

  // Calculate map region based on events with coordinates
  const mapRegion = useMemo((): Region => {
    const eventsWithCoords = events.filter(event => event.lat && event.lng);
    
    if (eventsWithCoords.length === 0) {
      // Default to Prague, Czech Republic
      return {
        latitude: 50.0755,
        longitude: 14.4378,
        latitudeDelta: 1.0,
        longitudeDelta: 1.0,
      };
    }

    if (eventsWithCoords.length === 1) {
      const event = eventsWithCoords[0];
      return {
        latitude: event.lat!,
        longitude: event.lng!,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    // Calculate bounding box for multiple events
    const lats = eventsWithCoords.map(e => e.lat!);
    const lngs = eventsWithCoords.map(e => e.lng!);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    const latDelta = Math.max(0.01, (maxLat - minLat) * 1.3); // 30% padding
    const lngDelta = Math.max(0.01, (maxLng - minLng) * 1.3);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [events]);

  const handleMarkerPress = useCallback((event: EventSummary) => {
    onMarkerPress(event);
  }, [onMarkerPress]);

  const renderMarkers = () => {
    return events
      .filter(event => event.lat && event.lng)
      .map((event) => (
        <Marker
          key={event.id}
          coordinate={{
            latitude: event.lat!,
            longitude: event.lng!,
          }}
          title={event.title}
          description={`${event.city ? `${event.city}, ` : ''}${event.country || ''} • ${event.eventCategory}`}
          onPress={() => handleMarkerPress(event)}
        />
      ));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]} testID={testID}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  const eventsWithCoords = events.filter(event => event.lat && event.lng);
  
  if (eventsWithCoords.length === 0) {
    return (
      <View style={[styles.container, styles.centered]} testID={testID}>
        <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
          No Events to Show
        </Text>
        <Text style={{ textAlign: 'center', opacity: 0.7 }}>
          No events have location data for the map view.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <MapView
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {renderMarkers()}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  map: {
    flex: 1,
  },
});