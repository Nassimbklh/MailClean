"use client";

import { useTranslation, Locale } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setLocale("fr")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          locale === "fr"
            ? "bg-blue-600 text-white"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          locale === "en"
            ? "bg-blue-600 text-white"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        EN
      </button>
    </div>
  );
}
