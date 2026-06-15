import React, { createContext, useContext } from 'react';
import { Language, AppTranslations, RTL_LANGUAGES } from '@/i18n/index';
import { useSettings } from '@/context/SettingsContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  t: AppTranslations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

/**
 * LanguageProvider أصبح الآن وسيطًا يفوّض كل الحالة إلى SettingsContext
 * لإزالة التكرار ومنع حالة السباق بين السياقين.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t, isRTL, settingsLoaded } = useSettings();

  // انتظر حتى تُحمّل الإعدادات لمنع الوميض
  const value: LanguageContextType = settingsLoaded
    ? { language, setLanguage, t, isRTL }
    : { language: 'ar', setLanguage, t: t, isRTL: true };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage outside LanguageProvider');
  return ctx;
}
