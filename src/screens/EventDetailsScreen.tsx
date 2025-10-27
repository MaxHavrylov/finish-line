import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Linking, Platform, Animated } from "react-native";
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
import { trackProviderFollow, trackProviderUnfollow } from "@/services/analytics";
import { addNotification } from "@/repositories/notificationsRepo";
import { useModalBackClose } from "@/hooks/useModalBackClose";
import { navigateBackOrTo } from "@/navigation/AppNavigator";
import { spacing } from '@/theme';
import { useSnackbar } from "../components/useSnackbar";

type EventParam = {
  eventId: string;
  favoriteChanged?: boolean;
};

export default function EventDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showError, showSuccess } = useSnackbar();
  const params = route.params as EventParam;
  
  // Always derive eventId from params - consistent behavior
  const eventId = params.eventId;
  
  // UI state
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [fav, setFav] = useState<boolean>(false);
  const [provider, setProvider] = useState<{ id: string; name: string; logoUrl?: string; website?: string } | null>(null);
  const [isFollowingProvider, setIsFollowingProvider] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const loadInFlight = useRef(false);

  // Animation state
  const heartScale = useRef(new Animated.Value(1)).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // My race state
  const [raceRecord, setRaceRecord] = useState<{ id: string; status: UserRaceStatus } | null>(null);
  const [raceFields, setRaceFields] = useState({
    bibNumber: '',
    waveNumber: '',
    startTimeLocal: '',
    targetTimeMinutes: '',
    note: ''
  });

  // Handle modal back close
  useModalBackClose({
    isVisible: manageModalVisible,
    onDismiss: () => setManageModalVisible(false)
  });

  useEffect(() => {
    if (loadInFlight.current) {
      console.log('[net] ignored duplicate load');
      return;
    }

    loadInFlight.current = true;
    (async () => {
      try {
        if (!eventId) {
          console.error('[EventDetails] No eventId provided');
          return;
        }
        
        console.log('[EventDetails] Loading event:', eventId);
        
        console.log('[EventDetails] Calling getEventById...');
        const d = await getEventById(eventId);
        console.log('[EventDetails] getEventById result:', !!d);
        
        console.log('[EventDetails] Calling isFavorite...');
        const f = await isFavorite(eventId);
        console.log('[EventDetails] isFavorite result:', f);
        
        console.log('[EventDetails] Calling userRacesRepo.getByEventId...');
        const r = await userRacesRepo.getByEventId(eventId);
        console.log('[EventDetails] userRacesRepo result:', !!r);
        
        console.log('[EventDetails] Calling providersRepo.getProviderByEventId...');
        const p = await providersRepo.getProviderByEventId(eventId);
        console.log('[EventDetails] providersRepo result:', !!p);
        
        console.log('[EventDetails] All calls completed, setting state...');
        
        if (!mounted.current) {
          console.log('[fx] unmounted, abort setState');
          return;
        }
        
        if (d) {
          setDetails(d);
          console.log('[EventDetails] Details set successfully');
        } else {
          console.warn('[EventDetails] No details found for event:', eventId);
        }
        setFav(f);
        setRaceRecord(r);
        setProvider(p);
        
        // Check follow status if provider exists
        if (p) {
          try {
            const following = await providersRepo.isFollowing('me', p.id);
            if (mounted.current) setIsFollowingProvider(following);
          } catch (error) {
            console.warn('Failed to check follow status:', error);
          }
        }
        
        console.log('[EventDetails] State update completed');
      } catch (error) {
        console.error('[EventDetails] Error in useEffect:', error);
      } finally {
        loadInFlight.current = false;
      }
    })();
  }, [eventId]);

  const onToggleFav = useCallback(async () => {
    // Trigger heart bump animation
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();

    const now = await toggleFavorite(eventId!);
    if (mounted.current) setFav(now);
    // Notify previous screen to refresh favorites
    if (navigation && navigation.setParams) {
      navigation.setParams({ ...route.params, favoriteChanged: true });
    }
  }, [eventId, navigation, route.params, heartScale]);

  const handleOpenInMaps = useCallback(() => {
    if (details && details.lat && details.lng) {
      const lat = details.lat;
      const lng = details.lng;
      const label = encodeURIComponent(details?.title || 'Event');
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
      const query = encodeURIComponent(`${details?.title || 'Event'} ${details?.city || ''}`);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  }, [details]);

  const handleAddToCalendar = useCallback(async () => {
    if (!details) return;
    setCalendarLoading(true);
    try {
      const { granted } = await ensureCalendarAccess();
      const eventDate = details?.startDate;
      if (!eventDate) return;
      
      const date = new Date(eventDate);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      if (granted) {
        await createEvent({
          title: details?.title || 'Event',
          startDate: start,
          endDate: end,
          location: details?.city || '',
          notes: details?.descriptionMarkdown || '',
          url: details?.registrationUrl || ''
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
  }, [details, t]);

  // Race management handlers
  const handleImGoing = useCallback(async () => {
    setSaving(true);
    try {
      const id = await userRacesRepo.saveFutureRace(eventId!);
      if (mounted.current) {
        setRaceRecord({ id, status: 'FUTURE' });
      }
    } catch (e) {
      console.warn('Failed to save race:', e);
      showError(t('errorSaving') || 'Failed to save race');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [eventId, t]);

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
      showError(t('errorSaving') || 'Failed to update race');
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

  const handleToggleFollowProvider = useCallback(async () => {
    if (!provider) return;
    
    setFollowLoading(true);
    const wasFollowing = isFollowingProvider;
    
    // Optimistic UI update
    setIsFollowingProvider(!wasFollowing);
    
    try {
      if (wasFollowing) {
        await providersRepo.unfollow('me', provider.id);
        // Track successful unfollow
        trackProviderUnfollow(provider.id);
      } else {
        await providersRepo.follow('me', provider.id);
        // Track successful follow
        trackProviderFollow(provider.id);
        
        // Add follow notification
        try {
          await addNotification({
            type: 'provider_follow',
            title: t('common:notif.followProviderTitle', { provider: provider.name }),
            body: t('common:notif.followProviderBody')
          });
        } catch (notifError) {
          // Silent fail for notifications
          console.warn('Failed to add notification:', notifError);
        }
      }
    } catch (error) {
      // Revert on error
      if (mounted.current) {
        setIsFollowingProvider(wasFollowing);
      }
      console.warn('Failed to toggle follow status:', error);
      showError('Failed to update follow status');
    } finally {
      if (mounted.current) setFollowLoading(false);
    }
  }, [provider, isFollowingProvider, t]);

  const canShowImGoing = !raceRecord || raceRecord.status !== 'FUTURE';

  const renderModal = () => (
    <Modal
      visible={manageModalVisible}
      onDismiss={() => setManageModalVisible(false)}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      dismissable={true}
      dismissableBackButton={true}
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
          {details?.coverImage ? (
            <Card.Cover source={{ uri: details.coverImage }} />
          ) : (
            <View style={styles.mapContainer}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: details?.lat ?? 53.7168,
                  longitude: details?.lng ?? -6.3533,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05
                }}
              >
                <Marker 
                  coordinate={{ 
                    latitude: details?.lat ?? 53.7168, 
                    longitude: details?.lng ?? -6.3533 
                  }} 
                  title={details?.title || 'Event'} 
                />
              </MapView>
            </View>
          )}

          <Card.Title
            title={details?.title || 'Event Details'}
            subtitle={details?.city || ''}
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
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Ionicons
                    name={fav ? "heart" : "heart-outline"}
                    size={22}
                    color={fav ? theme.colors.error : theme.colors.onSurface}
                  />
                </Animated.View>
              </Pressable>
            )}
          />

          <Card.Content>
            <Text variant="bodyMedium">Date: {details?.startDate ? new Date(details.startDate).toLocaleString() : 'TBD'}</Text>
            <Text variant="bodyMedium">Category: {details?.eventCategory || ''}</Text>

            {provider && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View testID="provider-block">
                  <Text variant="titleMedium" style={{ marginBottom: spacing.xs }}>{t('eventOrganizer')}</Text>
                  <Card style={styles.providerCard}>
                    <Pressable
                      style={styles.providerPressable}
                      onPress={() => (navigation as any).navigate("ProviderDetails", { 
                        providerId: provider.id, 
                        fromTab: (route.params as any)?.fromTab || 'DiscoverTab' 
                      })}
                      testID="provider-navigate"
                      android_ripple={{ color: theme.colors.primary, radius: 300 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={styles.providerMainContent}>
                        <View style={styles.providerInfo}>
                          <Text variant="titleSmall">{provider.name}</Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {t('viewProvider')}
                          </Text>
                        </View>
                        <Ionicons 
                          name="chevron-forward" 
                          size={20} 
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    </Pressable>
                    <View style={styles.providerButtons}>
                      <Button
                        mode={isFollowingProvider ? "outlined" : "contained"}
                        compact
                        onPress={handleToggleFollowProvider}
                        loading={followLoading}
                        disabled={followLoading}
                        testID="btn-follow-provider"
                        style={{ marginRight: spacing.sm }}
                        icon={isFollowingProvider ? "bell-off" : "bell-plus"}
                      >
                        {t(isFollowingProvider ? 'unfollowProvider' : 'followProvider')}
                      </Button>
                      {provider.website && (
                        <Button
                          mode="contained"
                          compact
                          onPress={() => provider.website && Linking.openURL(provider.website)}
                          testID="btn-provider-website"
                          icon="open-in-new"
                        >
                          {t('website')}
                        </Button>
                      )}
                    </View>
                  </Card>
                </View>
              </>
            )}

            <Divider style={{ marginVertical: 8 }} />
            <Text variant="titleMedium">Available Distances</Text>
            <View style={styles.row}>
              {details.distances.length === 0 ? (
                <Text variant="bodyMedium" style={{ opacity: 0.7 }}>No distances listed</Text>
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
                  icon="launch"
                  buttonColor={(theme.colors as any).cta}
                  textColor={(theme.colors as any).onCta}
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
                  icon="calendar-plus"
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
        <ActivityIndicator style={{ margin: spacing.xl }} />
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
    margin: spacing.lg, 
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
    gap: spacing.sm, 
    marginTop: spacing.sm 
  },
  chip: { 
    marginRight: spacing.sm,
    marginBottom: spacing.sm 
  },
  cardActions: {
    padding: spacing.lg,
  },
  buttonContainer: {
    gap: spacing.md,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  registerButton: {
    flex: 1,
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
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%'
  },
  modalTitle: {
    marginBottom: spacing.xl,
    textAlign: 'center'
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: 'transparent'
  },
  modalActions: {
    marginTop: spacing.xl,
    gap: spacing.md
  },
  actionButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm
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
    marginTop: spacing.xs,
    minHeight: 40,
  },
  providerInfo: {
    flex: 1,
  },
  providerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  providerCard: {
    marginVertical: spacing.xs,
    elevation: 2,
  },
  providerPressable: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  providerMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }
});
