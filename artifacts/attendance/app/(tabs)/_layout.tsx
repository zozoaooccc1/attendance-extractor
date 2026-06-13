import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated, useWindowDimensions,
} from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { moderateScale, clampFont } from '@/utils/responsive';
import { useSettings } from '@/context/SettingsContext';

const H_MARGIN = moderateScale(16);
const PILL_H = moderateScale(60);
const INDICATOR_INSET = 5;
const TAB_COUNT = 5;

const TAB_CONFIG = [
  { name: 'employee', label: 'الموظف',   icon: 'person-outline',        iconActive: 'person' },
  { name: 'index',    label: 'اليوم',    icon: 'home-outline',          iconActive: 'home' },
  { name: 'history',  label: 'السجل',    icon: 'list-outline',          iconActive: 'list' },
  { name: 'calendar', label: 'التقويم',  icon: 'calendar-outline',      iconActive: 'calendar' },
  { name: 'reports',  label: 'التقارير', icon: 'document-text-outline', iconActive: 'document-text' },
] as const;

type TabRoute = { key: string; name: string };
type EmitEvent = { type: string; target: string; canPreventDefault?: boolean };
type TabNavigation = {
  navigate: (name: string) => void;
  emit: (e: EmitEvent) => { defaultPrevented: boolean };
};
type TabState = { index: number; routes: TabRoute[] };

interface FloatingTabBarProps {
  state: TabState;
  navigation: TabNavigation;
  isDark: boolean;
  activeColor: string;
  inactiveColor: string;
  bottomOffset: number;
}

function FloatingTabBar({ state, navigation, isDark, activeColor, inactiveColor, bottomOffset }: FloatingTabBarProps) {
  const { width: SCREEN_W } = useWindowDimensions();
  const PILL_W = SCREEN_W - H_MARGIN * 2;
  const TAB_W = PILL_W / TAB_COUNT;
  const INDICATOR_W = TAB_W - INDICATOR_INSET * 2;

  const isIOS = Platform.OS === 'ios';
  const isNative = Platform.OS !== 'web';
  const { t } = useSettings();
  const TAB_LABELS = ['الموظف', t.tabs.today, t.tabs.history, t.tabs.calendar, t.tabs.reports];

  const indicatorX = useRef(new Animated.Value(state.index * TAB_W + INDICATOR_INSET)).current;
  const scaleAnims = useRef(
    TAB_CONFIG.map((_, i) => new Animated.Value(i === state.index ? 1 : 0.85))
  ).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: state.index * TAB_W + INDICATOR_INSET,
      useNativeDriver: isNative,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();

    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === state.index ? 1 : 0.85,
        useNativeDriver: isNative,
        damping: 16,
        stiffness: 200,
      }).start();
    });
  }, [state.index, TAB_W]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset, left: H_MARGIN, right: H_MARGIN }]}
    >
      <View style={[
        styles.pill,
        {
          width: PILL_W,
          height: PILL_H,
          borderRadius: PILL_H / 2,
          shadowColor: isDark ? '#000' : '#1d4ed8',
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.70)',
        },
      ]}>
        {isIOS ? (
          <BlurView
            intensity={80}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: isDark ? 'rgba(18,20,28,0.92)' : 'rgba(255,255,255,0.95)',
          }]} />
        )}

        <Animated.View
          style={[
            styles.indicator,
            {
              width: INDICATOR_W,
              height: PILL_H - INDICATOR_INSET * 2,
              borderRadius: (PILL_H - INDICATOR_INSET * 2) / 2,
              top: INDICATOR_INSET,
              backgroundColor: isDark ? 'rgba(88,166,255,0.18)' : 'rgba(29,78,216,0.10)',
              borderColor: isDark ? 'rgba(88,166,255,0.25)' : 'rgba(29,78,216,0.15)',
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />

        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const cfg = TAB_CONFIG[index];
            if (!cfg) return null;
            const isActive = state.index === index;
            const color = isActive ? activeColor : inactiveColor;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isActive && !event.defaultPrevented) {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    navigation.navigate(route.name);
                  }
                }}
                onLongPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.emit({ type: 'tabLongPress', target: route.key });
                }}
                activeOpacity={0.7}
                style={[styles.tabBtn, { width: TAB_W, height: PILL_H }]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={TAB_LABELS[index]}
              >
                <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnims[index] }] }]}>
                  <Ionicons
                    name={(isActive ? cfg.iconActive : cfg.icon) as any}
                    size={moderateScale(21)}
                    color={color}
                  />
                  <Text style={[
                    styles.label,
                    { color, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' },
                  ]}>
                    {TAB_LABELS[index]}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();

  const insets = useSafeAreaInsets();
  const isDark = resolvedScheme === 'dark';

  const activeColor = isDark ? '#58a6ff' : '#1d4ed8';
  const inactiveColor = isDark ? '#8b949e' : '#94a3b8';
  const bottomOffset = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8) + 8;

  return (
    <Tabs
      initialRouteName="employee"
      tabBar={(props) => (
        <FloatingTabBar
          {...(props as unknown as FloatingTabBarProps)}
          isDark={isDark}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          bottomOffset={bottomOffset}
        />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="employee" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="reports" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 24,
    pointerEvents: 'box-none',
  },
  pill: {
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  indicator: {
    position: 'absolute',
    borderWidth: 1,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: clampFont(10, 9, 12),
    letterSpacing: 0.2,
  },
});
