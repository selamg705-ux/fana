import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, MultilingualText } from '../types';
import { translations } from '../data/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  localize: (text: MultilingualText | undefined | null) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'mela_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
    if (saved && (saved === 'am' || saved === 'ti' || saved === 'en')) {
      return saved;
    }
    return 'am'; // Default language: Amharic as required
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const currentDict = translations[language];
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to Amharic, then English
    if (translations.am[key]) return translations.am[key];
    if (translations.en[key]) return translations.en[key];
    return key;
  };

  const localize = (text: MultilingualText | undefined | null): string => {
    if (!text) return '';
    if (text[language]) return text[language];
    if (text.am) return text.am;
    if (text.ti) return text.ti;
    if (text.en) return text.en;
    return '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, localize }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
