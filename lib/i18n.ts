"use client";

import { useState, useEffect } from "react";
import fr from "@/i18n/fr.json";
import en from "@/i18n/en.json";

export type Locale = "fr" | "en";

const translations = {
  fr,
  en,
};

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // Charger la langue depuis localStorage
    const savedLocale = localStorage.getItem("locale") as Locale | null;
    if (savedLocale && (savedLocale === "fr" || savedLocale === "en")) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = translations[locale];

  return { t, locale, setLocale };
}
