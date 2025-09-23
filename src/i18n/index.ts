// i18n bootstrap with per-locale JSON files and namespaces
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { getItem } from "@/utils/storage";

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

export const LANGUAGE_STORAGE_KEY = "settings.language";
export const SYSTEM_LANGUAGE = "system";

export const LANGUAGE_CODES = {
  system: SYSTEM_LANGUAGE,
  en: "en",
  uk: "uk",
  cs: "cs"
} as const;

export type LanguageCode = keyof typeof LANGUAGE_CODES;

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  system: "System",
  en: "English",
  uk: "Українська",
  cs: "Čeština"
};

export const resources = {
  en: { common: en_common, home: en_home, settings: en_settings },
  uk: { common: uk_common, home: uk_home, settings: uk_settings },
  cs: { common: cs_common, home: cs_home, settings: cs_settings }
};

// Get device language code (en, uk, cs) or fallback to en
export const getDeviceLanguage = (): LanguageCode => {
  const deviceLocale = 
    Localization.getLocales && Localization.getLocales().length > 0
      ? Localization.getLocales()[0].languageTag.toLowerCase()
      : "en";
  
  // Extract primary language code
  const primaryCode = deviceLocale.split("-")[0];
  
  return Object.keys(LANGUAGE_CODES).includes(primaryCode) 
    ? primaryCode as LanguageCode 
    : "en";
};

// Initialize i18n with system language
const initI18n = async () => {
  // Get saved language preference
  const savedLanguage = await getItem<LanguageCode>(LANGUAGE_STORAGE_KEY);
  const initialLanguage = savedLanguage || SYSTEM_LANGUAGE;
  
  // If system language or no preference, use device language
  const effectiveLanguage = initialLanguage === SYSTEM_LANGUAGE 
    ? getDeviceLanguage() 
    : initialLanguage;

  await i18n.use(initReactI18next).init({
    resources,
    lng: effectiveLanguage,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "home", "settings"],
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4"
  });
};

// Initialize
initI18n();

export default i18n;