import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, AppTranslations, translations, RTL_LANGUAGES } from '@/i18n/index';

export type TimeFormat = '12h' | '24h';
export type FontScale = 'sm' | 'md' | 'lg';
export type DefaultTab = 'employee' | 'index' | 'history' | 'calendar' | 'reports';
export type { Language };

interface SettingsContextType {
  timeFormat: TimeFormat;
  setTimeFormat: (f: TimeFormat) => void;
  fontScale: FontScale;
  setFontScale: (s: FontScale) => void;
  fontSizePercent: number;
  setFontSizePercent: (v: number) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  earlyReminder: boolean;
  setEarlyReminder: (v: boolean) => void;
  alarmBeforeShift: boolean;
  setAlarmBeforeShift: (v: boolean) => void;
  formatTime: (hhmm: string) => string;
  fontMultiplier: number;
  language: Language;
  setLanguage: (l: Language) => void;
  t: AppTranslations;
  isRTL: boolean;

  maxStorageMB: number;
  setMaxStorageMB: (mb: number) => void;
  settingsLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);
const KEY = 'attendance_app_settings_v1';
const LANG_KEY = 'attendance_language_v1';

function legacyScaleToPercent(s: unknown): number {
  if (s === 'sm') return 88;
  if (s === 'lg') return 116;
  return 100;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat,       setTF]  = useState<TimeFormat>('12h');
  const [fontScale,        setFS]  = useState<FontScale>('md');
  const [fontSizePercent,  setFSP] = useState<number>(100);
  const [highContrast,     setHC]  = useState<boolean>(false);
  const [earlyReminder,    setER]  = useState(false);
  const [alarmBeforeShift, setABS] = useState(false);
  const [language,         setLang] = useState<Language>('ar');

  const [maxStorageMB,     setMSMB] = useState<number>(1000);
  const [settingsLoaded,   setSL]  = useState(false);

  // طابور كتابة متسلسل لمنع حالة السباق
  const persistQueue = useRef(Promise.resolve());

  useEffect(() => {
    AsyncStorage.multiGet([KEY, LANG_KEY]).then(pairs => {
      const settingsStr = pairs[0][1];
      const langStr     = pairs[1][1];
      if (settingsStr) {
        try {
          const s = JSON.parse(settingsStr);
          if (s.timeFormat) setTF(s.timeFormat);
          if (typeof s.fontSizePercent === 'number') {
            setFSP(s.fontSizePercent);
          } else if (s.fontScale) {
            setFSP(legacyScaleToPercent(s.fontScale));
            setFS(s.fontScale);
          }
          if (typeof s.highContrast     === 'boolean') setHC(s.highContrast);
          if (typeof s.earlyReminder    === 'boolean') setER(s.earlyReminder);
          if (typeof s.alarmBeforeShift === 'boolean') setABS(s.alarmBeforeShift);

          if (typeof s.maxStorageMB     === 'number')  setMSMB(s.maxStorageMB);

          // دعم اللغة من الإعدادات القديمة أيضاً
          if (s.language === 'ar' || s.language === 'en') setLang(s.language);
        } catch (e) {
          console.warn('[SettingsContext] Failed to parse settings:', e);
        }
      }
      if (langStr === 'ar' || langStr === 'en') setLang(langStr);
      setSL(true);
    }).catch(e => {
      console.warn('[SettingsContext] Failed to load settings:', e);
      setSL(true);
    });
  }, []);

  /**
   * persist متسلسل: كل كتابة تنتظر الكتابة السابقة
   * لمنع فقدان البيانات عند استدعاء عدة setters بسرعة.
   */
  const persist = useCallback((patch: object) => {
    persistQueue.current = persistQueue.current
      .then(() => AsyncStorage.getItem(KEY))
      .then(v => {
        const cur = v ? JSON.parse(v) : {};
        return AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }));
      })
      .catch(e => {
        console.warn('[SettingsContext] Persist error:', e);
      });
  }, []);

  const setTimeFormat      = useCallback((f: TimeFormat) => { setTF(f);   persist({ timeFormat: f }); }, [persist]);
  const setFontScale       = useCallback((s: FontScale)  => {
    const pct = legacyScaleToPercent(s);
    setFS(s); setFSP(pct);
    persist({ fontScale: s, fontSizePercent: pct });
  }, [persist]);
  const setFontSizePercent = useCallback((v: number) => {
    const clamped = Math.max(80, Math.min(150, Math.round(v)));
    setFSP(clamped);
    persist({ fontSizePercent: clamped });
  }, [persist]);

  const setHighContrast     = useCallback((v: boolean) => { setHC(v);   persist({ highContrast: v });     }, [persist]);
  const setEarlyReminder    = useCallback((v: boolean) => { setER(v);   persist({ earlyReminder: v });    }, [persist]);
  const setAlarmBeforeShift = useCallback((v: boolean) => { setABS(v);  persist({ alarmBeforeShift: v }); }, [persist]);
  const setLanguage         = useCallback((l: Language) => {
    setLang(l);
    // حفظ اللغة في كلا المفتاحين لضمان الاتساق
    persist({ language: l });
    AsyncStorage.setItem(LANG_KEY, l).catch(e => {
      console.warn('[SettingsContext] Failed to save language key:', e);
    });
  }, [persist]);

  const setMaxStorageMB     = useCallback((mb: number) => {
    const clamped = Math.max(50, Math.min(10000, mb));
    setMSMB(clamped);
    persist({ maxStorageMB: clamped });
  }, [persist]);

  const t = translations[language];

  const formatTime = useCallback((hhmm: string): string => {
    if (!hhmm?.includes(':')) return hhmm;
    if (timeFormat === '24h') return hhmm;
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? t.pm : t.am;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }, [timeFormat, t]);

  const fontMultiplier = fontSizePercent / 100;
  const isRTL = RTL_LANGUAGES.includes(language);

  return (
    <SettingsContext.Provider value={{
      timeFormat, setTimeFormat,
      fontScale, setFontScale,
      fontSizePercent, setFontSizePercent,
      highContrast, setHighContrast,
      earlyReminder, setEarlyReminder,
      alarmBeforeShift, setAlarmBeforeShift,
      formatTime, fontMultiplier,
      language, setLanguage, t, isRTL,

      maxStorageMB, setMaxStorageMB,
      settingsLoaded,
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
