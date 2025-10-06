import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { 
  Card, Text, Button, Divider, Chip, ActivityIndicator, useTheme, Snackbar,
  Portal, Modal, TextInput
} from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { EventDetails, UserRaceStatus } from "@/types/events";
import { getEventById } from "@/repositories/eventsRepo";
import { isFavorite, toggleFavorite } from "@/repositories/favoritesRepo";
import { buildICS, saveAndShareICS, ensureCalendarAccess, createEvent } from '@/utils/calendar';
import * as userRacesRepo from "@/repositories/userRacesRepo";
import { providersRepo } from "@/repositories/providersRepo";
import { Provider } from "@/data/mockProviders";

type EventParam = {
  event: { id: string; title: string; date: string; location: string; category: string; distance: string; image?: string };
  favoriteChanged?: boolean;
};

export default function EventDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { event } = route.params as EventParam;
  
  // UI state
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [fav, setFav] = useState<boolean>(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);

  // My race state
  const [raceRecord, setRaceRecord] = useState<{ id: string; status: UserRaceStatus } | null>(null);
  const [raceFields, setRaceFields] = useState({
    bibNumber: '',
    waveNumber: '',
    startTimeLocal: '',
    targetTimeMinutes: '',
    note: ''
  });

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const [d, f, r, p] = await Promise.all([
        getEventById(event.id),
        isFavorite(event.id),
        userRacesRepo.getByEventId(event.id),
        providersRepo.getProviderByEventId(event.id)
      ]);
      if (mounted.current) {
        if (d) setDetails(d);
        setFav(f);
        setRaceRecord(r);
        setProvider(p);
      }
    })();
    return () => { mounted.current = false; };
  }, [event.id]);

  const onToggleFav = useCallback(async () => {
    const now = await toggleFavorite(event.id);
    if (mounted.current) setFav(now);
    // Notify previous screen to refresh favorites
    if (navigation && navigation.setParams) {
      navigation.setParams({ ...route.params, favoriteChanged: true });
    }
  }, [event.id, navigation, route.params]);

  const handleOpenInMaps = useCallback(() => {
    if (details && details.lat && details.lng) {
      const lat = details.lat;
      const lng = details.lng;
      const label = encodeURIComponent(event.title);
      let url = '';
      if (Platform.OS === 'ios') {
        url = `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
      } else if (Platform.OS === 'android') {
        url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      }
      Linking.openURL(url);
    } else {
      // Fallback: search by title/location
      const query = encodeURIComponent(`${event.title} ${event.location}`);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  }, [details, event]);

  const handleAddToCalendar = useCallback(async () => {
    if (!details) return;
    setCalendarLoading(true);
    try {
      const { granted } = await ensureCalendarAccess();
      const date = new Date(event.date);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      if (granted) {
        await createEvent({
          title: event.title,
          startDate: start,
          endDate: end,
          location: event.location,
          notes: details.descriptionMarkdown,
          url: details.registrationUrl
        });
        setSnackbarMessage(t('eventAddedToCalendar'));
        setSnackbarVisible(true);
      }
    } catch (e) {
      console.warn('Calendar error:', e);
      setSnackbarMessage(t('errorAddingToCalendar'));
      setSnackbarVisible(true);
    } finally {
      setCalendarLoading(false);
    }
  }, [details, event, t]);

  // Race management handlers
  const handleImGoing = useCallback(async () => {
    setSaving(true);
    try {
      const id = await userRacesRepo.saveFutureRace(event.id);
      if (mounted.current) {
        setRaceRecord({ id, status: 'FUTURE' });
      }
    } catch (e) {
      console.warn('Failed to save race:', e);
      setSnackbarMessage(t('errorSaving'));
      setSnackbarVisible(true);
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [event.id, t]);

  const handleManageSave = useCallback(async () => {
    if (!raceRecord) return;
    setSaving(true);
    try {
      const patch = {
        ...raceFields,
        targetTimeMinutes: raceFields.targetTimeMinutes ? Number(raceFields.targetTimeMinutes) : undefined
      };
      await userRacesRepo.updateFields(raceRecord.id, patch);
      setManageModalVisible(false);
    } catch (e) {
      console.warn('Failed to update race:', e);
      setSnackbarMessage(t('errorSaving'));
      setSnackbarVisible(true);
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [raceRecord, raceFields, t]);

  const handleNotGoing = useCallback(async () => {
    if (!raceRecord) return;
    setSaving(true);
    try {
      // Set fields to null and let the repo handle status internally
      await userRacesRepo.updateFields(raceRecord.id, {
        bibNumber: '',
        waveNumber: '',
        startTimeLocal: '',
        targetTimeMinutes: 0,
        note: ''
      });
      if (mounted.current) {
        setRaceRecord(null);
        setManageModalVisible(false);
      }
    } catch (e) {
      console.warn('Failed to cancel race:', e);
      setSnackbarMessage(t('errorSaving'));
      setSnackbarVisible(true);
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [raceRecord, t]);

  const canShowImGoing = !raceRecord || raceRecord.status !== 'FUTURE';

  const renderModal = () => (
    <Modal
      visible={manageModalVisible}
      onDismiss={() => setManageModalVisible(false)}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      testID="modal-manage"
    >
      <Text variant="titleLarge" style={styles.modalTitle}>{t('manageRace')}</Text>
      
      <TextInput
        label={t('bibNumber')}
        value={raceFields.bibNumber}
        onChangeText={text => setRaceFields(prev => ({ ...prev, bibNumber: text }))}
        style={styles.input}
        disabled={saving}
      />
      
      <TextInput
        label={t('waveNumber')}
        value={raceFields.waveNumber}
        onChangeText={text => setRaceFields(prev => ({ ...prev, waveNumber: text }))}
        style={styles.input}
        disabled={saving}
      />
      
      <TextInput
        label={t('startTime')}
        value={raceFields.startTimeLocal}
        onChangeText={text => setRaceFields(prev => ({ ...prev, startTimeLocal: text }))}
        style={styles.input}
        disabled={saving}
        placeholder="YYYY-MM-DD HH:mm"
      />
      
      <TextInput
        label={t('targetTime')}
        value={raceFields.targetTimeMinutes}
        onChangeText={text => setRaceFields(prev => ({ ...prev, targetTimeMinutes: text }))}
        style={styles.input}
        keyboardType="numeric"
        disabled={saving}
      />
      
      <TextInput
        label={t('note')}
        value={raceFields.note}
        onChangeText={text => setRaceFields(prev => ({ ...prev, note: text }))}
        style={styles.input}
        multiline
        numberOfLines={3}
        disabled={saving}
      />

      <View style={styles.modalActions}>
        <Button
          mode="outlined"
          onPress={handleNotGoing}
          style={styles.actionButton}
          disabled={saving}
          testID="btn-not-going"
        >
          {t('notGoing')}
        </Button>
        <View style={styles.actionButtonGroup}>
          <Button
            mode="text"
            onPress={() => setManageModalVisible(false)}
            style={styles.actionButton}
            disabled={saving}
            testID="btn-manage-cancel"
          >
            {t('cancel')}
          </Button>
          <Button
            mode="contained"
            onPress={handleManageSave}
            style={styles.actionButton}
            loading={saving}
            disabled={saving}
            testID="btn-manage-save"
          >
            {t('save')}
          </Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Portal>
        {renderModal()}
      </Portal>

      {details ? (
        <Card style={styles.card}>
          {event.image ? (
            <Card.Cover source={{ uri: event.image }} />
          ) : (
            <View style={styles.mapContainer}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: details.lat ?? 53.7168,
                  longitude: details.lng ?? -6.3533,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05
                }}
              >
                <Marker 
                  coordinate={{ 
                    latitude: details.lat ?? 53.7168, 
                    longitude: details.lng ?? -6.3533 
                  }} 
                  title={event.title} 
                />
              </MapView>
            </View>
          )}

          <Card.Title
            title={event.title}
            subtitle={event.location}
            right={() => (
              <Pressable 
                onPress={onToggleFav} 
                hitSlop={8} 
                style={({ pressed }) => ({ 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  opacity: pressed ? 0.7 : 1 
                })}
              > 
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={22}
                  color={fav ? theme.colors.error : theme.colors.onSurface}
                />
              </Pressable>
            )}
          />

          <Card.Content>
            <Text>Date: {new Date(event.date).toLocaleString()}</Text>
            <Text>Category: {event.category}</Text>

            {provider && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.providerSection} testID="provider-block">
                  <Text variant="titleMedium">Event Organizer</Text>
                  <View style={styles.providerContainer}>
                    <View style={styles.providerInfo}>
                      <Text variant="titleSmall">{provider.name}</Text>
                    </View>
                    {provider.website && (
                      <Button
                        mode="contained"
                        compact
                        onPress={() => Linking.openURL(provider.website)}
                        testID="btn-provider-website"
                      >
                        {t('actions.website')}
                      </Button>
                    )}
                  </View>
                </View>
              </>
            )}

            <Divider style={{ marginVertical: 8 }} />
            <Text variant="titleMedium">Available Distances</Text>
            <View style={styles.row}>
              {details.distances.length === 0 ? (
                <Text style={{ opacity: 0.7 }}>No distances listed</Text>
              ) : (
                details.distances.map((d) => (
                  <Chip key={d.id} style={styles.chip}>
                    {d.label}
                  </Chip>
                ))
              )}
            </View>
          </Card.Content>

          <Card.Actions style={styles.cardActions}>
            <View style={styles.buttonContainer}>
              {/* First row - Register Now and I'm Going */}
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={() => details?.registrationUrl ? Linking.openURL(details.registrationUrl) : null}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                  disabled={!details?.registrationUrl}
                >
                  {t('registerNow')}
                </Button>

                <Button
                  mode="contained"
                  onPress={canShowImGoing ? handleImGoing : () => setManageModalVisible(true)}
                  style={styles.primaryButton}
                  contentStyle={styles.buttonContent}
                  loading={saving}
                  disabled={saving}
                  testID={canShowImGoing ? "btn-im-going" : "btn-manage"}
                >
                  {canShowImGoing ? t('imGoing') : t('manage')}
                </Button>
              </View>

              {/* Second row - Map and Calendar */}
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleOpenInMaps}
                  icon="map"
                  style={styles.utilityButton}
                  contentStyle={styles.buttonContent}
                  testID="btn-open-maps"
                >
                  {t('openInMaps')}
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleAddToCalendar}
                  icon="calendar"
                  style={styles.utilityButton}
                  contentStyle={styles.buttonContent}
                  loading={calendarLoading}
                  disabled={calendarLoading}
                  testID="btn-add-calendar"
                >
                  {t('addToCalendar')}
                </Button>
              </View>
            </View>
          </Card.Actions>
        </Card>
      ) : (
        <ActivityIndicator style={{ margin: 20 }} />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  card: { 
    margin: 16, 
    borderRadius: 16,
    overflow: 'hidden'
  },
  mapContainer: {
    height: 200,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0'
  },
  row: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8, 
    marginTop: 8 
  },
  chip: { 
    marginRight: 8,
    marginBottom: 8 
  },
  cardActions: {
    padding: 16,
  },
  buttonContainer: {
    gap: 12,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#4CAF50', // Green color
  },
  primaryButton: {
    flex: 1,
  },
  utilityButton: {
    flex: 1,
  },
  buttonContent: {
    height: 44,
  },
  // Modal styles
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%'
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent'
  },
  modalActions: {
    marginTop: 20,
    gap: 12
  },
  actionButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  actionButton: {
    minWidth: 100
  },
  // Provider styles
  providerSection: {
    marginVertical: 8,
  },
  providerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  providerInfo: {
    flex: 1,
  }
});
