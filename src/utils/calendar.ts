// utils/calendar.ts
/**
 * Calendar utilities for FinishLine (Expo compatible, SDK 54+)
 */
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Calendar from 'expo-calendar';
import { Platform, Share } from 'react-native';

/**
 * Request calendar permissions and return access status
 */
export async function ensureCalendarAccess(): Promise<{ granted: boolean }> {
  try {
    if (Platform.OS === 'ios') {
      const calendarPerm = await Calendar.requestCalendarPermissionsAsync();
      const reminderPerm = await Calendar.requestRemindersPermissionsAsync();
      return { granted: calendarPerm.granted && reminderPerm.granted };
    } else {
      const { granted } = await Calendar.requestCalendarPermissionsAsync();
      return { granted };
    }
  } catch (e) {
    console.warn('Calendar permission request failed:', e);
    return { granted: false };
  }
}

/**
 * Get the ID of the default calendar for adding events
 */
export async function getDefaultCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      return defaultCal?.id ?? null;
    }
    
    // On Android, find first writable calendar not from Gmail
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCal = calendars.find(cal => 
      cal.accessLevel === Calendar.CalendarAccessLevel.OWNER &&
      cal.allowsModifications &&
      cal?.source?.name !== 'com.google.android.gm.labs'
    );
    return defaultCal?.id ?? null;
  } catch (e) {
    console.warn('Failed to get default calendar:', e);
    return null;
  }
}

/**
 * Create a calendar event and return its ID
 */
export async function createEvent(params: {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  url?: string;
}): Promise<string> {
  const calendarId = await getDefaultCalendarId();
  if (!calendarId) throw new Error('No writable calendar found');

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: params.title,
    startDate: params.startDate,
    endDate: params.endDate,
    location: params.location,
    notes: params.notes,
    url: params.url,
    alarms: [{
      relativeOffset: -60, // remind 1 hour before
      method: Calendar.AlarmMethod.ALERT
    }]
  });

  return eventId;
}

function formatICSDateUTC(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildICS(event: {
  id: string;
  title: string;
  location?: string;
  startISO: string;
  endISO?: string;
  description?: string;
  url?: string;
}): string {
  const dtstamp = formatICSDateUTC(new Date());
  const dtstart = formatICSDateUTC(event.startISO);
  const dtend = formatICSDateUTC(
    event.endISO || new Date(new Date(event.startISO).getTime() + 2 * 60 * 60 * 1000)
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//FinishLine//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@finishline`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${event.title}`,
    event.location ? `LOCATION:${event.location}` : '',
    event.description ? `DESCRIPTION:${event.description}` : '',
    event.url ? `URL:${event.url}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.filter(Boolean).join('\r\n');
}

export async function saveAndShareICS(ics: string, filename: string): Promise<void> {
  // 1) створюємо тимчасову папку в кеші
  const dir = new Directory(Paths.cache, 'ics');
  try {
    if (!dir.exists) dir.create(); // кине помилку, якщо немає прав
  } catch {}

  // 2) створюємо файл і записуємо контент
  const file = new File(dir, filename); // напр., 'race-123.ics'
  file.create();         // створює порожній файл (кине помилку, якщо вже є)
  file.write(ics);       // синхронний запис рядка

  try {
    // 3) шаримо
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/calendar',
        dialogTitle: 'Add to Calendar',
        UTI: 'public.calendar-event',
      });
    } else {
      await Share.share({
        url: file.uri,
        message: 'Add to Calendar',
      });
    }
  } finally {
    // 4) прибираємо за собою
    try {
      file.delete();
    } catch {}
  }
}