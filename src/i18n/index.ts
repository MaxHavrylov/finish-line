// i18n bootstrap (English, Ukrainian, Czech) with expo-localization
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

const resources = {
  en: {
    translation: {
      common: { switchLanguage: "Switch Language" },
      home: {
        title: "FinishLine",
        subtitle: "Expo + TypeScript + Paper + i18n + SQLite",
        body: "If you see this screen, your local setup works.",
        dbVersion: "DB bootstrap version: {{version}}"
      }
    }
  },
  uk: {
    translation: {
      common: { switchLanguage: "Змінити мову" },
      home: {
        title: "FinishLine",
        subtitle: "Expo + TypeScript + Paper + i18n + SQLite",
        body: "Якщо ти бачиш цей екран — локальний проєкт працює.",
        dbVersion: "Версія ініціалізації БД: {{version}}"
      }
    }
  },
  cs: {
    translation: {
      common: { switchLanguage: "Změnit jazyk" },
      home: {
        title: "FinishLine",
        subtitle: "Expo + TypeScript + Paper + i18n + SQLite",
        body: "Pokud vidíš tuto obrazovku, lokální projekt běží.",
        dbVersion: "Verze inicializace DB: {{version}}"
      }
    }
  }
};

// ✅ Use getLocales() safely
const deviceLng =
  Localization.getLocales && Localization.getLocales().length > 0
    ? Localization.getLocales()[0].languageTag.toLowerCase()
    : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4"
});

export default i18n;