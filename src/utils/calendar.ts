// utils/calendar.ts
/**
 * Calendar ICS utilities for FinishLine (Expo compatible, SDK 54+)
 */
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

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