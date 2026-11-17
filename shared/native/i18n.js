import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources } from '../i18n/resources.js';
import { LANGUAGES, languageInfo } from '../i18n/languages.js';

const KEY = 'language';

/** Saved choice, else the phone's language if we have a pack for it, else English. */
export async function initI18n() {
  const saved = await AsyncStorage.getItem(KEY);
  const device = getLocales()[0]?.languageCode;
  const lng = saved || (LANGUAGES.some((l) => l.code === device) ? device : 'en');
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false
  });
  return i18n;
}

export async function setLanguage(code) {
  await AsyncStorage.setItem(KEY, code);
  await i18n.changeLanguage(code);
}

export const currentScript = () => languageInfo(i18n.language).script;
export default i18n;
