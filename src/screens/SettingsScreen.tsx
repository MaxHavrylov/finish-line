import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Switch, List, Divider } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { getItem, setItem } from "@/utils/storage";
import i18n, { 
  LANGUAGE_STORAGE_KEY, 
  LANGUAGE_CODES, 
  SYSTEM_LANGUAGE,
  LanguageCode, 
  getDeviceLanguage 
} from "@/i18n";
import { ThemeContext, ThemeMode } from "@/theme/ThemeProvider";
import { useTranslation } from "react-i18next";
import { spacing } from '@/theme';

// Keys for AsyncStorage
const STORAGE_KEYS = {
  language: LANGUAGE_STORAGE_KEY,
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
  const navigation = useNavigation<any>();

  const [language, setLanguage] = useState<LanguageCode>(SYSTEM_LANGUAGE);
  const [eventReminders, setEventReminders] = useState<boolean>(true);
  const [communityUpdates, setCommunityUpdates] = useState<boolean>(true);
  const [communicationPrefs, setCommunicationPrefs] = useState<boolean>(false);

  // Load persisted non-theme settings
  useEffect(() => {
    (async () => {
      const lang = await getItem<LanguageCode>(STORAGE_KEYS.language);
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
    // Update i18n language when changed
    const effectiveLanguage = language === SYSTEM_LANGUAGE 
      ? getDeviceLanguage() 
      : language;
    i18n.changeLanguage(effectiveLanguage);
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
    // Cycle system -> en -> uk -> cs -> system
    const order: LanguageCode[] = ["system", "en", "uk", "cs"];
    const idx = order.indexOf(language);
    const next = order[(idx + 1) % order.length];
    setLanguage(next);
  };

  const cycleThemeMode = () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const idx = order.indexOf(mode);
    const next = order[(idx + 1) % order.length];
    setMode(next);
  };

  // Get the display name for the current language
  const getLanguageLabel = () => {
    if (language === SYSTEM_LANGUAGE) {
      return t("common:languageSystem");
    }
    const langMap = {
      en: "English",
      uk: "Ukrainian",
      cs: "Czech"
    };
    return t(`common:language${langMap[language]}`);
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
                {getLanguageLabel()}
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
          title={t("common:notifications")}
          description="View your notification inbox"
          descriptionNumberOfLines={1}
          left={(props) => <List.Icon {...props} icon="bell-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("Notifications")}
        />
        <Divider />
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
  container: { flex: 1, padding: spacing.lg },
  groupLabel: { opacity: 0.6, marginBottom: spacing.sm, letterSpacing: 0.5 },
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