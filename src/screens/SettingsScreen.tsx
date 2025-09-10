import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Switch, List, Divider } from "react-native-paper";
import { getItem, setItem } from "@/utils/storage";
import i18n from "@/i18n";
import { ThemeContext, ThemeMode } from "@/theme/ThemeProvider";
import { useTranslation } from "react-i18next";

// Keys for AsyncStorage
const STORAGE_KEYS = {
  language: "settings.language",
  reminders: "settings.reminders",
  community: "settings.community",
  comms: "settings.comms"
} as const;

// Reusable right-accessory wrapper with fixed width to prevent layout shift
function RightLabel({ children }: { children: React.ReactNode }) {
  return <View style={styles.rightFixed}>{children}</View>;
}

export default function SettingsScreen() {
  const { mode, setMode } = useContext(ThemeContext);
  const { t } = useTranslation();

  const [language, setLanguage] = useState<string>("English");
  const [eventReminders, setEventReminders] = useState<boolean>(true);
  const [communityUpdates, setCommunityUpdates] = useState<boolean>(true);
  const [communicationPrefs, setCommunicationPrefs] = useState<boolean>(false);

  // Load persisted non-theme settings
  useEffect(() => {
    (async () => {
      const lang = await getItem<string>(STORAGE_KEYS.language);
      const rem = await getItem<boolean>(STORAGE_KEYS.reminders);
      const com = await getItem<boolean>(STORAGE_KEYS.community);
      const cp = await getItem<boolean>(STORAGE_KEYS.comms);

      if (lang) setLanguage(lang);
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
    // Cycle EN -> UK -> CS -> EN (labels remain in local language names)
    const next =
      language === "English" ? "Українська" : language === "Українська" ? "Čeština" : "English";
    setLanguage(next);
    const code = next === "English" ? "en" : next === "Українська" ? "uk" : "cs";
    i18n.changeLanguage(code);
  };

  const cycleThemeMode = () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const idx = order.indexOf(mode);
    const next = order[(idx + 1) % order.length];
    setMode(next);
  };

  const themeLabel =
    mode === "system" ? t("settings:theme.system") : mode === "light" ? t("settings:theme.light") : t("settings:theme.dark");

  return (
    <View style={styles.container}>
      {/* GENERAL PREFERENCES */}
      <Text variant="labelLarge" style={styles.groupLabel}>
        {t("settings:sections.general")}
      </Text>

      <Card style={styles.card}>
        <List.Item
          style={styles.row}
          title={t("settings:language.title")}
          description={t("settings:language.desc")}
          descriptionNumberOfLines={1}
          right={() => (
            <RightLabel>
              <Text style={styles.rightText} numberOfLines={1}>
                {language}
              </Text>
            </RightLabel>
          )}
          onPress={cycleLanguage}
        />
        <Divider />
        <List.Item
          style={styles.row}
          title={t("settings:theme.title")}
          description={t("settings:theme.desc")}
          descriptionNumberOfLines={1}
          right={() => (
            <RightLabel>
              <Text style={styles.rightText} numberOfLines={1}>
                {themeLabel}
              </Text>
            </RightLabel>
          )}
          onPress={cycleThemeMode}
        />
      </Card>

      {/* NOTIFICATIONS */}
      <Text variant="labelLarge" style={[styles.groupLabel, { marginTop: 16 }]}>
        {t("settings:sections.notifications")}
      </Text>

      <Card style={styles.card}>
        <List.Item
          style={styles.row}
          title={t("settings:notifications.reminders.title")}
          description={t("settings:notifications.reminders.desc")}
          descriptionNumberOfLines={1}
          right={() => (
            <RightLabel>
              <Switch value={eventReminders} onValueChange={setEventReminders} />
            </RightLabel>
          )}
          onPress={() => setEventReminders((v) => !v)}
        />
        <Divider />
        <List.Item
          style={styles.row}
          title={t("settings:notifications.community.title")}
          description={t("settings:notifications.community.desc")}
          descriptionNumberOfLines={1}
          right={() => (
            <RightLabel>
              <Switch value={communityUpdates} onValueChange={setCommunityUpdates} />
            </RightLabel>
          )}
          onPress={() => setCommunityUpdates((v) => !v)}
        />
        <Divider />
        <List.Item
          style={styles.row}
          title={t("settings:notifications.comms.title")}
          description={t("settings:notifications.comms.desc")}
          descriptionNumberOfLines={1}
          right={() => (
            <RightLabel>
              <Switch value={communicationPrefs} onValueChange={setCommunicationPrefs} />
            </RightLabel>
          )}
          onPress={() => setCommunicationPrefs((v) => !v)}
        />
      </Card>

      {/* DATA & PRIVACY */}
      <Text variant="labelLarge" style={[styles.groupLabel, { marginTop: 16 }]}>
        {t("settings:sections.privacy")}
      </Text>

      <Card style={styles.card}>
        <List.Item
          style={styles.row}
          title={t("settings:privacy.title")}
          description={t("settings:privacy.desc")}
          right={(props) => (
            <RightLabel>
              <List.Icon {...props} icon="chevron-right" />
            </RightLabel>
          )}
          onPress={() => {
            // Placeholder for a dedicated screen
          }}
        />
      </Card>
    </View>
  );
}

const ROW_HEIGHT = 64;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  groupLabel: { opacity: 0.6, marginBottom: 8, letterSpacing: 0.5 },
  card: { borderRadius: 16 },
  row: {
    minHeight: ROW_HEIGHT,
    height: ROW_HEIGHT,
    justifyContent: "center"
  },
  rightFixed: {
    width: 120,
    alignItems: "flex-end",
    justifyContent: "center",
    height: "100%"
  },
  rightText: { opacity: 0.7 }
});