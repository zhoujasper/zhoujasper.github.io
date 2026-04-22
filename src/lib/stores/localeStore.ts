'use client';

import { create } from 'zustand';
import { matchLocale } from '@/lib/i18n/config';
import type { I18nRuntimeConfig } from '@/types/i18n';

const LOCALE_STORAGE_KEY = 'locale-storage';

interface LocaleStore {
  locale: string;
  isReady: boolean;
  locales: string[];
  defaultLocale: string;
  persistSelection: boolean;
  initialize: (config: I18nRuntimeConfig) => void;
  setLocale: (locale: string) => void;
}

function updateDocumentLocale(locale: string) {
  const root = document.documentElement;
  root.lang = locale;
  root.setAttribute('data-locale', locale);
}

function readUserSelectedLocale(locales: string[]): string | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return matchLocale(raw, locales);
  } catch {
    return null;
  }
}

function writeUserSelectedLocale(locale: string) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore storage errors
  }
}

function clearUserSelectedLocale() {
  try {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function resolveInitialLocale(config: I18nRuntimeConfig): string {
  // User-selected locale always wins when persistence is enabled.
  if (config.persist) {
    const userSelected = readUserSelectedLocale(config.locales);
    if (userSelected) {
      return userSelected;
    }
  }

  if (config.mode === 'fixed') {
    return config.fixedLocale;
  }

  const browserCandidates = [navigator.language, ...(navigator.languages || [])];
  for (const candidate of browserCandidates) {
    const browserLocale = matchLocale(candidate, config.locales);
    if (browserLocale) {
      return browserLocale;
    }
  }

  const bootLocale = matchLocale(document.documentElement.getAttribute('data-locale'), config.locales);
  return bootLocale || config.defaultLocale;
}

export const useLocaleStore = create<LocaleStore>()((set, get) => ({
  locale: 'en',
  isReady: false,
  locales: ['en'],
  defaultLocale: 'en',
  persistSelection: true,

  initialize: (config: I18nRuntimeConfig) => {
    const initialLocale = resolveInitialLocale(config);

    set({
      locale: initialLocale,
      isReady: true,
      locales: config.locales,
      defaultLocale: config.defaultLocale,
      persistSelection: config.persist,
    });

    if (config.persist) {
      // Keep system-language auto detection as default behavior.
      // Persist only explicit user selections via setLocale.
      const existingUserSelection = readUserSelectedLocale(config.locales);
      if (!existingUserSelection) {
        clearUserSelectedLocale();
      }
    } else {
      clearUserSelectedLocale();
    }

    updateDocumentLocale(initialLocale);
  },

  setLocale: (locale: string) => {
    const { locales, defaultLocale, persistSelection } = get();
    const nextLocale = matchLocale(locale, locales) || defaultLocale;

    set({ locale: nextLocale });

    if (persistSelection) {
      writeUserSelectedLocale(nextLocale);
    } else {
      clearUserSelectedLocale();
    }

    updateDocumentLocale(nextLocale);
  },
}));
