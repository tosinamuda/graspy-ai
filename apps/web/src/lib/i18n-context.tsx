'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserProfile, updateUserProfile } from './user-storage';
import { getLocaleCookie, setLocaleCookie } from './locale-cookie';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load user's language preference from cookie/localStorage on mount
  useEffect(() => {
    // Try cookie first (shared with server), then localStorage
    const cookieLocale = getLocaleCookie();
    const profile = getUserProfile();
    const localeToLoad = cookieLocale || profile?.language || 'en';
    loadLocale(localeToLoad);
  }, []);

  const loadLocale = async (newLocale: string) => {
    try {
      const localeMessages = await import(`@/locales/${newLocale}.json`);
      setMessages(localeMessages.default);
      setLocaleState(newLocale);
    } catch  {
      console.warn(`Locale ${newLocale} not found, falling back to English`);
      const fallbackMessages = await import(`@/locales/en.json`);
      setMessages(fallbackMessages.default);
      setLocaleState('en');
    } finally {
      setIsLoading(false);
    }
  };

  const setLocale = async (newLocale: string) => {
    await loadLocale(newLocale);

    // Update HTML attributes immediately for language switcher
    const isRTL = RTL_LANGUAGES.includes(newLocale);
    const direction = isRTL ? 'rtl' : 'ltr';
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = newLocale;
    }

    // Update cookie and user profile
    setLocaleCookie(newLocale);
    updateUserProfile({ language: newLocale });
  };

  // Calculate if current locale is RTL
  const isRTL = RTL_LANGUAGES.includes(locale);
  const direction = isRTL ? 'rtl' : 'ltr';

  // Translation function with nested key support
  const t = (key: string, values?: Record<string, string | number>): string => {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      {isLoading ? null : children}
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
