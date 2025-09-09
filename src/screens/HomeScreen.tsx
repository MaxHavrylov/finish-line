// A tiny first screen to confirm everything is wired correctly
import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { getDbVersion } from "@/db";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  const switchLang = () => {
    const next = i18n.language.startsWith("en")
      ? "uk"
      : i18n.language.startsWith("uk")
      ? "cs"
      : "en";
    i18n.changeLanguage(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Title title={t("home.title")} subtitle={t("home.subtitle")} />
        <Card.Content>
          <Text>{t("home.body")}</Text>
          <Text style={{ marginTop: 8 }}>
            {t("home.dbVersion", { version: getDbVersion() })}
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={switchLang}>
            {t("common.switchLanguage")}
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  card: { borderRadius: 16 }
});