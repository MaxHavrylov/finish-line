// i18n bootstrap with per-locale JSON files and namespaces
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Namespaces
// - common: generic UI strings (buttons, labels)
// - home: Home/landing screen copy
import en_common from "./locales/en/common.json";
import en_home from "./locales/en/home.json";
import uk_common from "./locales/uk/common.json";
import uk_home from "./locales/uk/home.json";
import cs_common from "./locales/cs/common.json";
import cs_home from "./locales/cs/home.json";

const resources = {
  en: {
    common: en_common,
    home: en_home
  },
  uk: {
    common: uk_common,
    home: uk_home
  },
  cs: {
    common: cs_common,
    home: cs_home
  }
};

// Derive device language; fallback to 'en'
const deviceLng =
  Localization.getLocales && Localization.getLocales().length > 0
    ? Localization.getLocales()[0].languageTag.toLowerCase()
    : "en";

// If you prefer to strip region (e.g., en-us -> en), uncomment:
// const baseLng = deviceLng.split("-")[0];

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLng, // or baseLng
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "home"],
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4"
});

export default i18n;