export type Locale = "ja" | "en";

export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_STORAGE_KEY = "mikan-script-locale";

export const isLocale = (value: unknown): value is Locale => value === "ja" || value === "en";
