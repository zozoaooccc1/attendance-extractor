import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, AppState,
  AppStateStatus, Alert, Modal,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AttendanceProvider } from "@/context/AttendanceContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { EmployeeProvider } from "@/context/EmployeeContext";
import { isPINEnabled, verifyPIN } from "@/utils/pinAuth";
import { moderateScale, clampFont } from "@/utils/responsive";
import { RestoreModal } from "@/components/RestoreModal";
import { ChangelogModal } from "@/components/ChangelogModal";
import { AppUpdateModal } from "@/components/AppUpdateModal";
import { getLatestChangelog, CURRENT_VERSION, type ChangelogItem } from "@/constants/changelog";
import { runDailyBackupIfNeeded, importBackupFromDownloads, restoreFromBackupData } from "@/utils/backup";
import { initDatabase, getAllDates } from "@/utils/database";
import { onAppStarting, onAppStable, clearCurrentUpdateBadFlag } from "@/utils/crashGuard";
import { setupNotificationHandler } from "@/utils/notifications";
import { checkForAppUpdate, type AppUpdateInfo } from "@/utils/easUpdateChecker";
import { initOneSignal } from "@/utils/oneSignalService";

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();
initOneSignal();
const queryClient = new QueryClient();
const BIOMETRIC_KEY = "attendance_biometric_lock";
const AUTO_LOCK_MS = 2 * 60 * 1000;

// ── Crash Recovery Banner ─────────────────────────────────────────────────────
function CrashRecoveryBanner({
  crashCount,
  onDismiss,
  onMarkStable,
}: {
  crashCount: number;
  onDismiss: () => void;
  onMarkStable: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={crash.overlay}>
        <View style={crash.card}>
          <View style={crash.iconRow}>
            <View style={crash.iconWrap}>
              <Ionicons name="warning-outline" size={moderateScale(36)} color="#f97316" />
            </View>
          </View>
          <Text style={crash.title}>⚡ تم اكتشاف عدم استقرار</Text>
          <Text style={crash.body}>
            {"انهار التطبيق "}
            {crashCount}
            {" مرة متتالية.\n"}
            {"التطبيق سيعمل بشكل طبيعي. إذا استمرت المشكلة جرّب إعادة تثبيت أحدث إصدار."}
          </Text>
          <TouchableOpacity style={crash.btnPrimary} onPress={onMarkStable}>
            <Ionicons name="checkmark-circle-outline" size={moderateScale(20)} color="#fff" />
            <Text style={crash.btnPrimaryText}>التطبيق يعمل الآن — استمر</Text>
          </TouchableOpacity>
          <TouchableOpacity style={crash.btnSecondary} onPress={onDismiss}>
            <Text style={crash.btnSecondaryText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Biometric lock ────────────────────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [error, setError] = useState("");
  const tryAuth = async () => {
    setError("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "تحقق من هويتك للدخول",
        fallbackLabel: "رمز المرور",
        cancelLabel: "إلغاء",
        disableDeviceFallback: false,
      });
      if (result.success) onUnlock();
      else setError("فشل التحقق. حاول مجدداً.");
    } catch { setError("البيومتري غير متاح على هذا الجهاز."); }
  };
  useEffect(() => { tryAuth(); }, []);
  return (
    <View style={lock.container}>
      <View style={lock.card}>
        <View style={lock.iconWrap}>
          <Ionicons name="lock-closed" size={moderateScale(48)} color="#1d4ed8" />
        </View>
        <Text style={lock.title}>تطبيق الحضور</Text>
        <Text style={lock.sub}>محمي بالبصمة / Face ID</Text>
        {!!error && <Text style={lock.err}>{error}</Text>}
        <TouchableOpacity style={lock.btn} onPress={tryAuth}>
          <Ionicons name="finger-print-outline" size={moderateScale(22)} color="#fff" />
          <Text style={lock.btnText}>فتح القفل</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── PIN lock ──────────────────────────────────────────────────────────────────
function PINLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleDigit = async (d: string) => {
    if (checking || digits.length >= 6) return;
    const next = [...digits, d];
    setDigits(next);
    setError("");
    if (next.length >= 4) {
      setChecking(true);
      const pin = next.join('');
      const ok = await verifyPIN(pin);
      if (ok) { onUnlock(); return; }
      if (next.length >= 6 || next.length === 4) {
        if (!ok) {
          setError("رمز خاطئ، حاول مجدداً");
          setTimeout(() => { setDigits([]); setChecking(false); }, 600);
          return;
        }
      }
      setChecking(false);
    }
  };

  const handleBack = () => { setDigits(d => d.slice(0, -1)); setError(""); };
  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','✓']];

  return (
    <View style={pin.container}>
      <View style={pin.card}>
        <Ionicons name="keypad-outline" size={moderateScale(40)} color="#1d4ed8" style={{ marginBottom: 8 }} />
        <Text style={pin.title}>أدخل رمز PIN</Text>
        <View style={pin.dotsRow}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[pin.dot, digits[i] ? pin.dotFilled : {}]} />
          ))}
        </View>
        {!!error && <Text style={pin.err}>{error}</Text>}
        <View style={pin.keypad}>
          {rows.map((row, ri) => (
            <View key={ri} style={pin.kRow}>
              {row.map(k => (
                <TouchableOpacity
                  key={k} style={pin.kBtn}
                  onPress={() => { if (k === '⌫') handleBack(); else if (k === '✓') {} else handleDigit(k); }}
                  activeOpacity={0.7}
                >
                  <Text style={pin.kText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

type LockType = 'none' | 'biometric' | 'pin';

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, animationDuration: 380 }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="capture" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="record-detail" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="day-detail" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="image-view" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [locked, setLocked] = useState(false);
  const [lockType, setLockType] = useState<LockType>('none');
  const [lockChecked, setLockChecked] = useState(false);
  const bgTimeRef = useRef<number | null>(null);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // APK update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);

  // Restore modal
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Changelog modal
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [changelogToShow, setChangelogToShow] = useState<ChangelogItem | null>(null);

  // Crash guard state
  const [crashWarningVisible, setCrashWarningVisible] = useState(false);
  const [detectedCrashCount, setDetectedCrashCount] = useState(0);

  // ── Auto-lock on background ───────────────────────────────────────────────
  useEffect(() => {
    if (lockType === 'none') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        bgTimeRef.current = Date.now();
      } else if (state === 'active' && bgTimeRef.current !== null) {
        const elapsed = Date.now() - bgTimeRef.current;
        bgTimeRef.current = null;
        if (elapsed >= AUTO_LOCK_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [lockType]);

  // ── Cold-start initialization ─────────────────────────────────────────────
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    (async () => {
      // 1. Crash guard
      if (Platform.OS !== 'web') {
        try {
          const result = await onAppStarting();
          if (result.shouldWarnUser) {
            setDetectedCrashCount(result.crashCount);
            setCrashWarningVisible(true);
          }
        } catch {}
      }

      // 2. Check lock
      if (Platform.OS !== 'web') {
        const bioEnabled = await AsyncStorage.getItem(BIOMETRIC_KEY);
        const pinEnabled = await isPINEnabled();
        const hasBio = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (bioEnabled === '1' && hasBio && enrolled) {
          setLockType('biometric');
          setLocked(true);
        } else if (pinEnabled) {
          setLockType('pin');
          setLocked(true);
        }
      }
      setLockChecked(true);

      // 3. Unhide splash screen
      SplashScreen.hideAsync();

      // 4. Daily backup
      try { await runDailyBackupIfNeeded(AsyncStorage); } catch {}

      // 5. First-launch restore offer
      try {
        const seenRestore = await AsyncStorage.getItem('attendance_seen_restore_v1');
        if (!seenRestore) {
          const dates = getAllDates();
          if (dates.length === 0) setShowRestoreModal(true);
          await AsyncStorage.setItem('attendance_seen_restore_v1', '1');
        }
      } catch {}

      // 6. Notification permissions
      if (Platform.OS !== 'web') {
        try {
          const askedNotif = await AsyncStorage.getItem('attendance_notif_asked_v1');
          if (!askedNotif) {
            if (Platform.OS === 'android') {
              await Notifications.setNotificationChannelAsync('updates', {
                name: 'تحديثات التطبيق',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1d4ed8',
              });
            }
            await Notifications.requestPermissionsAsync();
            await AsyncStorage.setItem('attendance_notif_asked_v1', '1');
          }
        } catch {}
      }

      // 7. Show changelog after update
      if (Platform.OS !== 'web') {
        try {
          const lastSeen = await AsyncStorage.getItem('attendance_last_seen_version');
          if (lastSeen !== CURRENT_VERSION) {
            const entry = getLatestChangelog();
            if (entry) { setChangelogToShow(entry); setShowChangelogModal(true); }
            await AsyncStorage.setItem('attendance_last_seen_version', CURRENT_VERSION);
          }
        } catch {}
      }

      // 8. Mark stable after 10 s
      if (Platform.OS !== 'web') {
        stableTimerRef.current = setTimeout(async () => {
          try { await onAppStable(); } catch {}
        }, 10_000);
      }

      // 9. Check for APK update (non-blocking — runs in background)
      if (Platform.OS !== 'web') {
        checkForAppUpdate().then(info => {
          if (info) { setUpdateInfo(info); setShowUpdateModal(true); }
        }).catch(() => {});
      }
    })();

    return () => {
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
    };
  }, [fontsLoaded, fontError]);

  const handleRestore = async () => {
    setShowRestoreModal(false);
    try {
      const data = await importBackupFromDownloads();
      if (!data) return;
      const { restored } = await restoreFromBackupData(data);
      if (restored > 0) Alert.alert('✅ تمت الاستعادة', `تم استعادة ${restored} سجل بنجاح.`);
    } catch {
      Alert.alert('❌ خطأ', 'تعذّرت استعادة النسخة الاحتياطية.');
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  if ((!fontsLoaded && !fontError) || !lockChecked) return null;

  if (locked) {
    if (lockType === 'pin') return <PINLockScreen onUnlock={() => setLocked(false)} />;
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AttendanceProvider>
                    <EmployeeProvider>
                      <RootLayoutNav />
                    </EmployeeProvider>
                  </AttendanceProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SettingsProvider>

      <RestoreModal
        visible={showRestoreModal}
        onRestore={handleRestore}
        onSkip={() => setShowRestoreModal(false)}
      />

      <ChangelogModal
        visible={showChangelogModal}
        changelog={changelogToShow}
        onDismiss={() => setShowChangelogModal(false)}
      />

      <AppUpdateModal
        visible={showUpdateModal}
        info={updateInfo}
        onDismiss={() => setShowUpdateModal(false)}
      />

      {crashWarningVisible && (
        <CrashRecoveryBanner
          crashCount={detectedCrashCount}
          onDismiss={() => setCrashWarningVisible(false)}
          onMarkStable={async () => {
            setCrashWarningVisible(false);
            try { await clearCurrentUpdateBadFlag(); } catch {}
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const crash = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000BB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1e293b', borderRadius: 24, padding: 28, width: '100%', gap: 16, borderWidth: 1, borderColor: '#f9731640' },
  iconRow: { alignItems: 'center' },
  iconWrap: { width: moderateScale(72), height: moderateScale(72), borderRadius: moderateScale(36), backgroundColor: '#f9731615', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#f97316', fontSize: clampFont(18, 15, 22), fontWeight: '700', textAlign: 'center' },
  body: { color: '#94a3b8', fontSize: clampFont(14, 12, 16), textAlign: 'center', lineHeight: 22 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14 },
  btnPrimaryText: { color: '#fff', fontSize: clampFont(15, 13, 17), fontWeight: '700' },
  btnSecondary: { alignItems: 'center', paddingVertical: 10 },
  btnSecondaryText: { color: '#64748b', fontSize: clampFont(14, 12, 16) },
});

const lock = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#1e293b", borderRadius: 24, padding: 36, alignItems: "center", gap: 12, width: "80%" },
  iconWrap: { width: moderateScale(88), height: moderateScale(88), borderRadius: moderateScale(44), backgroundColor: "#1d4ed820", alignItems: "center", justifyContent: "center" },
  title: { color: "#f1f5f9", fontSize: clampFont(22, 18, 26), fontWeight: "700" },
  sub: { color: "#94a3b8", fontSize: clampFont(14, 12, 16) },
  err: { color: "#f87171", fontSize: clampFont(13, 11, 15), textAlign: "center" },
  btn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1d4ed8", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  btnText: { color: "#fff", fontSize: clampFont(16, 14, 18), fontWeight: "700" },
});

const pin = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#1e293b", borderRadius: 24, padding: 28, alignItems: "center", gap: 10, width: "85%" },
  title: { color: "#f1f5f9", fontSize: clampFont(18, 15, 22), fontWeight: "700" },
  dotsRow: { flexDirection: "row", gap: 14, marginVertical: 8 },
  dot: { width: moderateScale(16), height: moderateScale(16), borderRadius: moderateScale(8), borderWidth: 2, borderColor: "#475569" },
  dotFilled: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  err: { color: "#f87171", fontSize: clampFont(13, 11, 15) },
  keypad: { gap: 8, marginTop: 8 },
  kRow: { flexDirection: "row", gap: 8 },
  kBtn: { width: moderateScale(72), height: moderateScale(56), borderRadius: moderateScale(14), backgroundColor: "#293548", alignItems: "center", justifyContent: "center" },
  kText: { color: "#f1f5f9", fontSize: clampFont(22, 18, 26), fontWeight: "600" },
});
