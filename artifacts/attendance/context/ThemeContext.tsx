import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  resolvedScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  setPreference: () => {},
  resolvedScheme: 'light',
});

const THEME_KEY = 'app_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') {
        setPreferenceState(v);
      }
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(THEME_KEY, p);
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system'
      ? systemScheme === 'dark' ? 'dark' : 'light'
      : preference;

  return (
    <ThemeContext.Provider value={{ preference, setPreference, resolvedScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
