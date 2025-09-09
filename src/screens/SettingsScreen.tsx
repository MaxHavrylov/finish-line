import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Switch, List, Divider } from "react-native-paper";
import { getItem, setItem } from "@/utils/storage";
import i18n from "@/i18n";

// Keys for AsyncStorage
const STORAGE_KEYS = {
  language: "settings.language",
  theme: "settings.theme",
  reminders: "settings.reminders",
  community: "settings.community",
  comms: "settings.comms"
} as const;

type ThemePref = "Auto" | "Light" | "Dark";

export default function SettingsScreen() {
  const [language, setLanguage] = useState<string>("English");
  const [theme, setTheme] = useState<ThemePref>("Auto");
  const [eventReminders, setEventReminders] = useState<boolean>(true);
  const [communityUpdates, setCommunityUpdates] = useState<boolean>(true);
  const [communicationPrefs, setCommunicationPrefs] = useState<boolean>(false);

  // Load persisted settings
  useEffect(() => {
    (async () => {
      const lang = await getItem<string>(STORAGE_KEYS.language);
      const th = await getItem<ThemePref>(STORAGE_KEYS.theme);
      const rem = await getItem<boolean>(STORAGE_KEYS.reminders);
      const com = await getItem<boolean>(STORAGE_KEYS.community);
      const cp = await getItem<boolean>(STORAGE_KEYS.comms);

      if (lang) setLanguage(lang);
      if (th) setTheme(th);
      if (typeof rem === "boolean") setEventReminders(rem);
      if (typeof com === "boolean") setCommunityUpdates(com);
      if (typeof cp === "boolean") setCommunicationPrefs(cp);
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    setItem(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    setItem(STORAGE_KEYS.reminders, eventReminders);
  }, [eventReminders]);

  useEffect(() => {
    setItem(STORAGE_KEYS.community, communityUpdates);
  }, [communityUpdates]);

  useEffect(() => {
    setItem(STORAGE_KEYS.comms, communicationPrefs);
  }, [communicationPrefs]);

  // Handlers
  const cycleLanguage = () => {
    // Cycle through EN -> UK -> CS -> EN
    const next =
      language === "English" ? "Українська" : language === "Українська" ? "Čeština" : "English";
    setLanguage(next);

    // Also change i18n language for live effect
    const code = next === "English" ? "en" : next === "Українська" ? "uk" : "cs";
    i18n.changeLanguage(code);
  };

  const cycleTheme = () => {
    const next = theme === "Auto" ? "Light" : theme === "Light" ? "Dark" : "Auto";
    setTheme(next);
    // Note: We store the preference now; wiring actual theming (system/dark) can be done later.
  };

  return (
    <View style={styles.container}>
      {/* GENERAL PREFERENCES */}
      <Text variant="labelLarge" style={styles.groupLabel}>
        GENERAL PREFERENCES
      </Text>

      <Card style={styles.card}>
        <List.Item
          title="Language"
          description="App language"
          right={() => <Text style={styles.rightText}>{language}</Text>}
          onPress={cycleLanguage}
        />
        <Divider />
        <List.Item
          title="Theme"
          description="Automatic, light, or dark"
          right={() => <Text style={styles.rightText}>{theme}</Text>}
          onPress={cycleTheme}
        />
      </Card>

      {/* NOTIFICATIONS */}
      <Text variant="labelLarge" style={[styles.groupLabel, { marginTop: 16 }]}>
        NOTIFICATIONS
      </Text>

      <Card style={styles.card}>
        <List.Item
          title="Event Reminders"
          description="Upcoming race alerts and deadlines."
          right={() => (
            <Switch value={eventReminders} onValueChange={setEventReminders} />
          )}
          onPress={() => setEventReminders((v) => !v)}
        />
        <Divider />
        <List.Item
          title="Community Updates"
          description="News from friends and challenges."
          right={() => (
            <Switch value={communityUpdates} onValueChange={setCommunityUpdates} />
          )}
          onPress={() => setCommunityUpdates((v) => !v)}
        />
        <Divider />
        <List.Item
          title="Communication Preferences"
          description="Manage email and push notifications."
          right={() => (
            <Switch value={communicationPrefs} onValueChange={setCommunicationPrefs} />
          )}
          onPress={() => setCommunicationPrefs((v) => !v)}
        />
      </Card>

      {/* DATA & PRIVACY */}
      <Text variant="labelLarge" style={[styles.groupLabel, { marginTop: 16 }]}>
        DATA & PRIVACY
      </Text>

      <Card style={styles.card}>
        <List.Item
          title="Data & Privacy"
          description="Control your data and permissions."
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Placeholder for a dedicated screen
          }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  groupLabel: { opacity: 0.6, marginBottom: 8, letterSpacing: 0.5 },
  card: { borderRadius: 16 },
  rightText: { opacity: 0.7 }
});