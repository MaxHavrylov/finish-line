// i18n bootstrap with per-locale JSON files and namespaces
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Namespaces
import en_common from "./locales/en/common.json";
import en_home from "./locales/en/home.json";
import en_settings from "./locales/en/settings.json";

import uk_common from "./locales/uk/common.json";
import uk_home from "./locales/uk/home.json";
import uk_settings from "./locales/uk/settings.json";

import cs_common from "./locales/cs/common.json";
import cs_home from "./locales/cs/home.json";
import cs_settings from "./locales/cs/settings.json";

const resources = {
  en: { common: en_common, home: en_home, settings: en_settings },
  uk: { common: uk_common, home: uk_home, settings: uk_settings },
  cs: { common: cs_common, home: cs_home, settings: cs_settings }
};

const deviceLng =
  Localization.getLocales && Localization.getLocales().length > 0
    ? Localization.getLocales()[0].languageTag.toLowerCase()
    : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLng,
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "home", "settings"],
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4"
});

export default i18n;