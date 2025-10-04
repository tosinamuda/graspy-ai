'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserProfile, updateUserProfile } from './user-storage';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
}

// RTL (Right-to-Left) languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'ps', 'ku'];

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  const [messages, setMessages] = useState<Record<string, any>>({});

  // Load user's language preference from localStorage
  useEffect(() => {
    const profile = getUserProfile();
    if (profile?.language) {
      loadLocale(profile.language);
    }
  }, []);

  const loadLocale = async (newLocale: string) => {
    try {
      const localeMessages = await import(`@/locales/${newLocale}.json`);
      setMessages(localeMessages.default);
      setLocaleState(newLocale);

      // Update document direction for RTL
      updateDocumentDirection(newLocale);
    } catch (error) {
      console.warn(`Locale ${newLocale} not found, falling back to English`);
      const fallbackMessages = await import(`@/locales/en.json`);
      setMessages(fallbackMessages.default);
      setLocaleState('en');
      updateDocumentDirection('en');
    }
  };

  const updateDocumentDirection = (locale: string) => {
    const isRTL = RTL_LANGUAGES.includes(locale);
    const direction = isRTL ? 'rtl' : 'ltr';

    // Update HTML element
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = locale;
    }
  };

  const setLocale = async (newLocale: string) => {
    await loadLocale(newLocale);
    // Update user profile
    updateUserProfile({ language: newLocale });
  };

  // Calculate if current locale is RTL
  const isRTL = RTL_LANGUAGES.includes(locale);
  const direction = isRTL ? 'rtl' : 'ltr';

  // Translation function with nested key support
  const t = (key: string, values?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = messages;

    for (const k of keys) {
      if (result && typeof result === 'object') {
        result = result[k];
      } else {
        return key; // Return key if not found
      }
    }

    if (typeof result !== 'string') {
      return key;
    }

    // Replace placeholders like {name} with values
    if (values) {
      return result.replace(/\{(\w+)\}/g, (match, key) => {
        return values[key]?.toString() || match;
      });
    }

    return result;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL, direction }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
