import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, AppTranslations, translations, RTL_LANGUAGES } from '@/i18n/index';

interface LanguageContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  t: AppTranslations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);
const KEY = 'attendance_language_v1';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('ar');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v === 'ar' || v === 'en') setLang(v);
    });
  }, []);

  const setLanguage = useCallback((l: Language) => {
    setLang(l);
    AsyncStorage.setItem(KEY, l);
  }, []);

  const t = translations[language];
  const isRTL = RTL_LANGUAGES.includes(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage outside LanguageProvider');
  return ctx;
}
