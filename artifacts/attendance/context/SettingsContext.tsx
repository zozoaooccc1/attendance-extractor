import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, AppTranslations, translations, RTL_LANGUAGES } from '@/i18n/index';

export type TimeFormat = '12h' | '24h';
export type FontScale = 'sm' | 'md' | 'lg';
export type { Language };

interface SettingsContextType {
  timeFormat: TimeFormat;
  setTimeFormat: (f: TimeFormat) => void;
  fontScale: FontScale;
  setFontScale: (s: FontScale) => void;
  earlyReminder: boolean;
  setEarlyReminder: (v: boolean) => void;
  formatTime: (hhmm: string) => string;
  fontMultiplier: number;
  language: Language;
  setLanguage: (l: Language) => void;
  t: AppTranslations;
  isRTL: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);
const KEY = 'attendance_app_settings_v1';
const LANG_KEY = 'attendance_language_v1';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat, setTF] = useState<TimeFormat>('12h');
  const [fontScale, setFS] = useState<FontScale>('md');
  const [earlyReminder, setER] = useState(false);
  const [language, setLang] = useState<Language>('ar');

  useEffect(() => {
    AsyncStorage.multiGet([KEY, LANG_KEY]).then(pairs => {
      const settingsStr = pairs[0][1];
      const langStr = pairs[1][1];
      if (settingsStr) {
        try {
          const s = JSON.parse(settingsStr);
          if (s.timeFormat) setTF(s.timeFormat);
          if (s.fontScale) setFS(s.fontScale);
          if (typeof s.earlyReminder === 'boolean') setER(s.earlyReminder);
        } catch {}
      }
      if (langStr === 'ar' || langStr === 'en') setLang(langStr);
    });
  }, []);

  const persist = useCallback((patch: object) => {
    AsyncStorage.getItem(KEY).then(v => {
      const cur = v ? JSON.parse(v) : {};
      AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }));
    });
  }, []);

  const setTimeFormat = useCallback((f: TimeFormat) => { setTF(f); persist({ timeFormat: f }); }, [persist]);
  const setFontScale  = useCallback((s: FontScale) => { setFS(s); persist({ fontScale: s }); }, [persist]);
  const setEarlyReminder = useCallback((v: boolean) => { setER(v); persist({ earlyReminder: v }); }, [persist]);
  const setLanguage = useCallback((l: Language) => {
    setLang(l);
    AsyncStorage.setItem(LANG_KEY, l);
  }, []);

  const t = translations[language];

  const formatTime = useCallback((hhmm: string): string => {
    if (!hhmm?.includes(':')) return hhmm;
    if (timeFormat === '24h') return hhmm;
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? t.pm : t.am;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }, [timeFormat, t]);

  const fontMultiplier = fontScale === 'sm' ? 0.88 : fontScale === 'lg' ? 1.16 : 1.0;
  const isRTL = RTL_LANGUAGES.includes(language);

  return (
    <SettingsContext.Provider value={{
      timeFormat, setTimeFormat,
      fontScale, setFontScale,
      earlyReminder, setEarlyReminder,
      formatTime, fontMultiplier,
      language, setLanguage, t, isRTL,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}
