"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SupportedLanguage, TranslationDictionary, UI_TRANSLATIONS, getSpeechLocale } from "./i18n";
import { BHASHINI_LANGUAGES, BhashiniLanguage } from "./bhashini";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: keyof TranslationDictionary) => string;
  speechLocale: string;
  currentLanguageInfo: BhashiniLanguage | undefined;
  languages: BhashiniLanguage[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => UI_TRANSLATIONS.en[key] || String(key),
  speechLocale: "en-IN",
  currentLanguageInfo: BHASHINI_LANGUAGES[1],
  languages: BHASHINI_LANGUAGES,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>("en");

  useEffect(() => {
    // 1. Read saved preference from cookie or localStorage
    try {
      const match = document.cookie.match(/revclaim_lang=([a-zA-Z-]+)/);
      const saved = match?.[1] || localStorage.getItem("revclaim_lang");
      if (saved && (UI_TRANSLATIONS[saved] || BHASHINI_LANGUAGES.some((l) => l.value === saved))) {
        setLanguageState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (newLang: string) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem("revclaim_lang", newLang);
      document.cookie = `revclaim_lang=${newLang}; Path=/; SameSite=Lax; max-age=31536000`;
      window.dispatchEvent(new CustomEvent("revclaim_lang_changed", { detail: { lang: newLang } }));
    } catch {
      // ignore
    }
  };

  const t = (key: keyof TranslationDictionary): string => {
    const dict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
    return dict[key] || UI_TRANSLATIONS.en[key] || String(key);
  };

  const speechLocale = getSpeechLocale(language);
  const currentLanguageInfo = BHASHINI_LANGUAGES.find((l) => l.value === language) || BHASHINI_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        speechLocale,
        currentLanguageInfo,
        languages: BHASHINI_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
