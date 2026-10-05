import { useEffect, useState } from "react";

// Kit strings in English and Indonesian. `id` is typed against `en`'s keys, so a missing translation
// fails the typecheck rather than showing a blank. Game-specific strings live with the game.

const en = {
  "daily.loading": "Loading today's puzzle…",
  "daily.unavailable": "No puzzle right now. Check back tomorrow.",
  "daily.error": "That didn't go through: {message}",
  "daily.submit": "Submit",
  "daily.submitting": "Submitting…",
  "daily.duplicate": "You've already submitted today. One a day.",
  "daily.score": "Your score: {score}. Optimum: {optimum}.",
  "stats.line": "Played {played} · Optimal {optimal} · Streak {current} · Best {max}",
  "share.button": "Share",
  "share.copied": "Copied to clipboard.",
  "share.failed": "Couldn't share. Try again.",
} as const;

export type StringKey = keyof typeof en;

const id: Record<StringKey, string> = {
  "daily.loading": "Memuat teka-teki hari ini…",
  "daily.unavailable": "Belum ada teka-teki. Coba lagi besok.",
  "daily.error": "Gagal terkirim: {message}",
  "daily.submit": "Kirim",
  "daily.submitting": "Mengirim…",
  "daily.duplicate": "Kamu sudah mengirim hari ini. Satu kali sehari.",
  "daily.score": "Skor kamu: {score}. Optimum: {optimum}.",
  "stats.line": "Main {played} · Optimal {optimal} · Beruntun {current} · Terbaik {max}",
  "share.button": "Bagikan",
  "share.copied": "Disalin ke papan klip.",
  "share.failed": "Gagal membagikan. Coba lagi.",
};

export const strings = { en, id };
export type Lang = keyof typeof strings;

/** `{name}` placeholders are filled from `vars`; one with no value is left as is, so it shows. */
export function t(
  key: StringKey,
  lang: Lang = "en",
  vars: Record<string, string | number> = {},
): string {
  return strings[lang][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in vars ? String(vars[name]) : placeholder,
  );
}

/**
 * English on the server and the first render (so hydration matches), then the browser's language.
 * Indonesian readers see one frame of English; accepted over a hydration mismatch.
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    if (navigator.language.toLowerCase().startsWith("id")) setLang("id");
  }, []);
  return lang;
}
