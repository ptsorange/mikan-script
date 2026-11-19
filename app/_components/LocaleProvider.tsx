"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, MESSAGES, type Locale, type Messages } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const listeners = new Set<() => void>();
let memoryLocale: Locale | null = null;

function readClientLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* ignore storage errors */
  }
  if (memoryLocale) return memoryLocale;
  if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("ja")) {
    return "en";
  }
  return DEFAULT_LOCALE;
}

function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}

function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCALE_STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function writeClientLocale(next: Locale): void {
  memoryLocale = next;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* ignore storage errors */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  listeners.forEach((listener) => listener());
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, readClientLocale, getServerLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (next: Locale) => writeClientLocale(next);
  const toggleLocale = () => writeClientLocale(locale === "ja" ? "en" : "ja");

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t: MESSAGES[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      toggleLocale: () => {},
      t: MESSAGES[DEFAULT_LOCALE],
    };
  }
  return ctx;
}
