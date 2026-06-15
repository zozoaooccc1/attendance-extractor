import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Switch, Alert, ActivityIndicator,
  LayoutAnimation, UIManager, PanResponder, GestureResponderEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';
import {
  exportBackupToDownloads, exportFullBackupToDownloads,
  importBackupFromDownloads, restoreFromBackupData, getInternalBackupInfo,
} from '@/utils/backup';
import { getImagesStats, deleteImagesOlderThan } from '@/utils/imageStorage';
import { useColors } from '@/hooks/useColors';
import { useTheme, ThemePreference } from '@/context/ThemeContext';
import { useSettings, TimeFormat, FontScale } from '@/context/SettingsContext';
import { useAttendance } from '@/context/AttendanceContext';
import { isPINEnabled, disablePIN } from '@/utils/pinAuth';
import {
  requestNotificationPermissions,
  scheduleSingleShiftReminders,
  scheduleDoubleShiftReminders,
  scheduleAlarmBurst,
  cancelAllAttendanceReminders,
  sendImmediateAlert,
} from '@/utils/notifications';
import { ShiftType } from '@/constants/types';
import { CURRENT_VERSION } from '@/constants/changelog';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';
import { checkForAppUpdate, type AppUpdateInfo } from '@/utils/easUpdateChecker';
import { AppUpdateModal } from '@/components/AppUpdateModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NOTIF_KEY       = 'attendance_notif_settings_v2';
const BIOMETRIC_KEY   = 'attendance_biometric_lock';
const AUTO_DELETE_KEY = 'attendance_auto_delete_months';
const UPDATES_FROZEN_KEY = 'updates_frozen';

const SINGLE_SCHEDULE = [
  { time: '12:00 م', label: 'تذكير بصمة الدخول',        icon: 'log-in-outline'       as const },
  { time: '12:15 م', label: 'تنبيه: آخر موعد البصمة',   icon: 'alert-circle-outline' as const },
  { time: '12:00 ص', label: 'تذكير بصمة نهاية الدوام',  icon: 'log-out-outline'      as const },
];
const DOUBLE_SCHEDULE = [
  { time: '9:00 ص',  label: 'دخول الشفت الأول',        icon: 'log-in-outline'       as const },
  { time: '9:15 ص',  label: 'آخر موعد الشفت الأول',    icon: 'alert-circle-outline' as const },
  { time: '12:00 م', label: 'خروج الشفت الأول',         icon: 'log-out-outline'      as const },
  { time: '4:00 م',  label: 'دخول الشفت الثاني',        icon: 'log-in-outline'       as const },
  { time: '4:15 م',  label: 'آخر موعد الشفت الثاني',   icon: 'alert-circle-outline' as const },
  { time: '12:00 ص', label: 'نهاية الدوام',             icon: 'log-out-outline'      as const },
];

type UpdateStatus = 'idle'|'checking'|'downloading'|'up-to-date'|'error';

// ── مكوّن شريط تمرير حجم الخط ───────────────────────────────────────────────
function FontSlider({ value, onChange, colors: c, isRTL: rtl }: { value: number; onChange: (v: number) => void; colors: any; isRTL?: boolean }) {
  const MIN = 80, MAX = 150;
  const sliderWidthRef = useRef(0);

  const toPercent = (px: number) => {
    if (sliderWidthRef.current <= 0) return value;
    const adjustedPx = rtl ? sliderWidthRef.current - px : px;
    const raw = MIN + (adjustedPx / sliderWidthRef.current) * (MAX - MIN);
    return Math.max(MIN, Math.min(MAX, Math.round(raw)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => onChange(toPercent(e.nativeEvent.locationX)),
      onPanResponderMove:  (e: GestureResponderEvent) => onChange(toPercent(e.nativeEvent.locationX)),
    })
  ).current;

  const fillPct = ((value - MIN) / (MAX - MIN)) * 100;
  const THUMB = 22;

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{ height: 36, justifyContent: 'center', paddingHorizontal: THUMB / 2 }}
        onLayout={e => { sliderWidthRef.current = e.nativeEvent.layout.width - THUMB; }}
        {...panResponder.panHandlers}
      >
        {/* Track */}
        <View style={{ height: 6, backgroundColor: c.border, borderRadius: 3, marginHorizontal: THUMB / 2 }}>
          <View style={{ height: 6, width: `${fillPct}%` as any, backgroundColor: c.primary, borderRadius: 3 }} />
        </View>
        {/* Thumb */}
        <View style={{
          position: 'absolute',
          left: `${fillPct}%` as any,
          width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: c.primary,
          marginLeft: -THUMB / 2 + THUMB / 2,
          top: (36 - THUMB) / 2,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
          borderWidth: 2, borderColor: '#fff',
        }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Text style={{ color: c.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>80%</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: c.primary, fontSize: 16, fontFamily: 'Inter_700Bold' }}>{value}%</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>حجم الخط</Text>
        </View>
        <Text style={{ color: c.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>150%</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors       = useColors();
  const insets       = useSafeAreaInsets();
  const router       = useRouter();
  const { preference, setPreference, resolvedScheme } = useTheme();
  const {
    timeFormat, setTimeFormat, fontScale, setFontScale,
    fontSizePercent, setFontSizePercent,
    highContrast, setHighContrast,
    earlyReminder, setEarlyReminder,
    alarmBeforeShift, setAlarmBeforeShift,
    fontMultiplier, language, setLanguage, t, isRTL,
    maxStorageMB, setMaxStorageMB,
  } = useSettings();
  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);
  const { deleteOldRecords } = useAttendance();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [notifEnabled,        setNotifEnabled]        = useState(false);
  const [notifShift,          setNotifShift]           = useState<ShiftType>('single');
  const [saving,              setSaving]               = useState(false);
  const [testingSend,         setTestingSend]          = useState(false);
  const [biometricEnabled,    setBiometricEnabled]     = useState(false);
  const [biometricAvailable,  setBiometricAvailable]   = useState(false);
  const [pinEnabled,          setPinEnabled]           = useState(false);
  const [autoDeleteMonths,    setAutoDeleteMonths]     = useState<number>(0);
  const [updateStatus,        setUpdateStatus]         = useState<UpdateStatus>('idle');
  const [openSection,         setOpenSection]          = useState<string | null>(null);
  const [showUpdateModal,     setShowUpdateModal]      = useState(false);
  const [updateInfo,          setUpdateInfo]           = useState<AppUpdateInfo | null>(null);
  const [isFrozen,            setIsFrozen]             = useState(false);
  // Storage stats
  const [storageStats,        setStorageStats]         = useState<{ count: number; totalMB: number } | null>(null);
  const [loadingStorage,      setLoadingStorage]       = useState(false);
  const [cleaningImages,      setCleaningImages]       = useState(false);
  const [cleanMonths,         setCleanMonths]          = useState<number>(6);
  // Backup
  const [backingUp,           setBackingUp]            = useState(false);
  const [backingUpFull,       setBackingUpFull]        = useState(false);
  const [backupProgress,      setBackupProgress]       = useState(0);
  const [restoring,           setRestoring]            = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then(v => {
      if (v) { try { const s = JSON.parse(v); setNotifEnabled(s.enabled ?? false); setNotifShift(s.shift ?? 'single'); } catch {} }
    });
    AsyncStorage.getItem(BIOMETRIC_KEY).then(v => setBiometricEnabled(v === '1'));
    AsyncStorage.getItem(AUTO_DELETE_KEY).then(v => { if (v) setAutoDeleteMonths(Number(v)); });
    AsyncStorage.getItem(UPDATES_FROZEN_KEY).then(v => setIsFrozen(v === 'true'));
    isPINEnabled().then(setPinEnabled);
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(has => {
        if (has) LocalAuthentication.isEnrolledAsync().then(enrolled => setBiometricAvailable(enrolled));
      });
    }
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    if (Platform.OS === 'web') return;
    setLoadingStorage(true);
    try {
      const stats = await getImagesStats();
      setStorageStats(stats);
    } finally {
      setLoadingStorage(false);
    }
  };

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection(prev => prev === key ? null : key);
  };

  const handleCheckUpdate = async () => {
    if (updateStatus === 'checking') return;
    setUpdateStatus('checking');
    try {
      const info = await checkForAppUpdate(true);
      if (info) {
        setUpdateInfo(info);
        setShowUpdateModal(true);
        setUpdateStatus('idle');
      } else {
        setUpdateStatus('up-to-date');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) { Alert.alert('التنبيهات', 'يرجى السماح من إعدادات الهاتف'); return; }
    } else { await cancelAllAttendanceReminders(); }
    setNotifEnabled(value);
  };

  const handleTestNotification = async () => {
    if (Platform.OS === 'web') { Alert.alert('ملاحظة', 'التنبيهات تعمل فقط على الجوال'); return; }
    setTestingSend(true);
    try {
      const granted = await requestNotificationPermissions();
      if (!granted) { Alert.alert('التنبيهات محظورة', 'افتح الإعدادات وفعّل التنبيهات'); return; }
      await sendImmediateAlert('🔔 اختبار التنبيه', 'التنبيهات تعمل بشكل صحيح ✅');
      Alert.alert('تم الإرسال ✅', 'ابحث عن التنبيه في شريط الإشعارات');
    } catch { Alert.alert('خطأ', 'فشل الإرسال'); }
    finally { setTestingSend(false); }
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'تحقق من هويتك لتفعيل القفل', cancelLabel: 'إلغاء' });
      if (!result.success) { Alert.alert('تعذّر التحقق'); return; }
    }
    await AsyncStorage.setItem(BIOMETRIC_KEY, value ? '1' : '0');
    setBiometricEnabled(value);
  };

  const handleDisablePIN = async () => {
    Alert.alert('إلغاء PIN', 'هل تريد إلغاء رمز PIN؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم، إلغاء PIN', style: 'destructive', onPress: async () => { await disablePIN(); setPinEnabled(false); } },
    ]);
  };

  const handleAutoDelete = async (months: number) => {
    if (months === 0) { await AsyncStorage.setItem(AUTO_DELETE_KEY, '0'); setAutoDeleteMonths(0); return; }
    Alert.alert('تأكيد', `سيتم حذف السجلات الأقدم من ${months} أشهر. هل تريد المتابعة؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تأكيد', style: 'destructive', onPress: async () => {
        await AsyncStorage.setItem(AUTO_DELETE_KEY, String(months));
        setAutoDeleteMonths(months);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - months);
        const yy = cutoff.getFullYear();
        const mm = String(cutoff.getMonth()+1).padStart(2,'0');
        const dd = String(cutoff.getDate()).padStart(2,'0');
        const paths = deleteOldRecords(`${yy}-${mm}-${dd}`);
        for (const p of paths) { try { await FileSystem.deleteAsync(p, { idempotent: true }); } catch {} }
        Alert.alert('تم', `تم حذف السجلات الأقدم من ${months} أشهر`);
        loadStorageStats();
      }},
    ]);
  };

  const handleCleanImages = async () => {
    Alert.alert(
      '🗑️ تنظيف الصور القديمة',
      `سيتم حذف صور البصمة الأقدم من ${cleanMonths} أشهر بشكل نهائي.\nالسجلات ستبقى كما هي بدون صور.\n\nهل تريد المتابعة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تنظيف', style: 'destructive', onPress: async () => {
          setCleaningImages(true);
          try {
            const deleted = await deleteImagesOlderThan(cleanMonths);
            await loadStorageStats();
            Alert.alert('✅ تم التنظيف', `تم حذف ${deleted} صورة قديمة\nتم تحرير مساحة تخزين`);
          } finally {
            setCleaningImages(false);
          }
        }},
      ]
    );
  };

  const handleBackup = async () => {
    if (Platform.OS === 'web') { Alert.alert('النسخ الاحتياطي', 'متاح فقط على الجوال'); return; }
    setBackingUp(true);
    try {
      const result = await exportBackupToDownloads();
      if (result === 'ok') {
        Alert.alert('✅ تم الحفظ', 'تم حفظ النسخة الاحتياطية (بيانات فقط، بدون صور) في المجلد الذي اخترته.');
      } else if (result !== 'cancelled') {
        Alert.alert('خطأ', 'فشل إنشاء النسخة الاحتياطية');
      }
    } finally { setBackingUp(false); }
  };

  const handleFullBackup = async () => {
    if (Platform.OS === 'web') { Alert.alert('النسخ الاحتياطي', 'متاح فقط على الجوال'); return; }
    const stats = storageStats;
    Alert.alert(
      '📦 نسخة شاملة مع الصور',
      `ستشمل هذه النسخة:\n• جميع سجلاتك\n• ${stats?.count ?? '?'} صورة بصمة (${stats?.totalMB ?? '?'} MB)\n\nقد تستغرق بعض الوقت حسب عدد الصور. هل تريد المتابعة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حفظ', onPress: async () => {
          setBackingUpFull(true);
          setBackupProgress(0);
          try {
            const result = await exportFullBackupToDownloads((done, total) => {
              setBackupProgress(Math.round((done / total) * 100));
            });
            if (result === 'ok') {
              Alert.alert('✅ تم الحفظ', 'تم حفظ النسخة الشاملة (بيانات + صور) في المجلد الذي اخترته.');
            } else if (result !== 'cancelled') {
              Alert.alert('خطأ', 'فشل إنشاء النسخة الشاملة');
            }
          } finally { setBackingUpFull(false); setBackupProgress(0); }
        }},
      ]
    );
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') { Alert.alert('الاستيراد', 'متاح فقط على الجوال'); return; }
    setRestoring(true);
    try {
      const data = await importBackupFromDownloads();
      if (!data) { Alert.alert('لم يُعثر على نسخة', 'تأكد أن ملف النسخة الاحتياطية موجود في المجلد المحدد.'); return; }
      const hasImages = data.images && Object.keys(data.images).length > 0;
      Alert.alert(
        'استيراد النسخة الاحتياطية',
        `تم العثور على ${data.records?.length ?? 0} سجل${hasImages ? ` + صور` : ''} بتاريخ ${new Date(data.exportedAt).toLocaleDateString('ar')}. هل تريد الاستيراد؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'استيراد', onPress: async () => {
            const { restored, skipped, imagesRestored } = await restoreFromBackupData(data);
            Alert.alert('✅ تم الاستيراد', `تمت استعادة ${restored} سجل${skipped > 0 ? ` (تخطي ${skipped} مكرر)` : ''}${imagesRestored > 0 ? `\n+ ${imagesRestored} صورة` : ''}`);
            loadStorageStats();
          }},
        ]
      );
    } catch { Alert.alert('خطأ', 'فشل استيراد النسخة الاحتياطية'); }
    finally { setRestoring(false); }
  };

  const handleToggleFreeze = async (value: boolean) => {
    await AsyncStorage.setItem(UPDATES_FROZEN_KEY, value ? 'true' : 'false');
    setIsFrozen(value);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify({ enabled: notifEnabled, shift: notifShift }));
      if (notifEnabled) {
        if (alarmBeforeShift) {
          // المنبّه الصاخب: إشعار كل 5 ثوانٍ قبل 15 دقيقة من الدوام
          await scheduleAlarmBurst(notifShift);
          Alert.alert('تم حفظ الإعدادات ✅', 'المنبّه الصاخب مفعّل — سيتكرر الإشعار كل 5 ثوانٍ قبل 15 دقيقة من الدوام', [{ text: 'حسناً' }]);
        } else {
          if (notifShift === 'single') await scheduleSingleShiftReminders(earlyReminder ? 5 : 0);
          else await scheduleDoubleShiftReminders(earlyReminder ? 5 : 0);
          const msg = earlyReminder ? t.settings.notify5minEarly : 'التنبيهات عند موعد البصمة';
          Alert.alert('تم حفظ الإعدادات', msg, [{ text: 'حسناً' }]);
        }
      } else {
        await cancelAllAttendanceReminders();
        Alert.alert('تم', 'تم إيقاف التنبيهات');
      }
    } catch { Alert.alert('خطأ', 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const themeOptions: { key: ThemePreference; label: string; icon: any }[] = [
    { key: 'light',  label: t.settings.themeLight, icon: 'sunny-outline'          },
    { key: 'dark',   label: t.settings.themeDark,  icon: 'moon-outline'           },
    { key: 'system', label: t.settings.themeAuto,  icon: 'phone-portrait-outline' },
  ];

  const updateBtnConfig = {
    idle:         { label: t.settings.checkUpdate,       icon: 'cloud-download-outline'   as const, bg: colors.primary },
    checking:     { label: t.settings.checkingUpdate,    icon: 'cloud-download-outline'   as const, bg: colors.primary },
    downloading:  { label: t.settings.downloadingUpdate, icon: 'cloud-download-outline'   as const, bg: colors.primary },
    'up-to-date': { label: t.settings.upToDate,          icon: 'checkmark-circle-outline' as const, bg: colors.success ?? '#22c55e' },
    error:        { label: t.settings.updateError,       icon: 'alert-circle-outline'     as const, bg: '#ef4444' },
  }[updateStatus];

  const schedule  = notifShift === 'single' ? SINGLE_SCHEDULE : DOUBLE_SCHEDULE;
  const themeLabel = themeOptions.find(o => o.key === preference)?.label ?? '';
  const timeLabel  = timeFormat === '12h' ? t.settings.time12h : t.settings.time24h;
  const fontLabel  = `${fontSizePercent}%`;

  // حساب شريط مساحة الصور (max = maxStorageMB أو غير محدود)
  const storageFillPct = storageStats && maxStorageMB > 0
    ? Math.min(100, (storageStats.totalMB / maxStorageMB) * 100)
    : 0;
  const storageColor      = storageFillPct > 70 ? '#ef4444' : storageFillPct > 40 ? '#f59e0b' : '#22c55e';
  const storageLimitLabel = maxStorageMB === -1 ? 'غير محدود' : maxStorageMB >= 1000 ? `${maxStorageMB / 1000} GB` : `${maxStorageMB} MB`;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.md, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={moderateScale(24)} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t.settings.title}</Text>
        <View style={{ width: moderateScale(40) }} />
      </View>

      {/* ══════════════ GROUP: المظهر ══════════════ */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
        {language === 'ar' ? 'المظهر' : 'Appearance'}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Theme */}
        <SRow colors={colors} styles={styles}
          icon={resolvedScheme === 'dark' ? 'moon' : 'sunny-outline'} iconColor="#3b82f6"
          title={t.settings.theme} value={themeLabel}
          expanded={openSection === 'theme'} onPress={() => toggleSection('theme')} />
        {openSection === 'theme' && (
          <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
            <View style={styles.chipRow}>
              {themeOptions.map(opt => (
                <TouchableOpacity key={opt.key}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted },
                    preference === opt.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setPreference(opt.key)}
                >
                  <Ionicons name={opt.icon} size={moderateScale(15)} color={preference === opt.key ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[styles.chipText, { color: preference === opt.key ? colors.primaryForeground : colors.mutedForeground },
                    preference === opt.key && { fontFamily: 'Inter_700Bold' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <RowSep colors={colors} />

        {/* Time format */}
        <SRow colors={colors} styles={styles} icon="time-outline" iconColor="#3b82f6"
          title={t.settings.timeFormat} value={timeLabel}
          expanded={openSection === 'time'} onPress={() => toggleSection('time')} />
        {openSection === 'time' && (
          <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
            <View style={styles.chipRow}>
              {(['12h','24h'] as TimeFormat[]).map(f => (
                <TouchableOpacity key={f}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted },
                    timeFormat === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setTimeFormat(f)}
                >
                  <Text style={[styles.chipText, { color: timeFormat === f ? colors.primaryForeground : colors.mutedForeground },
                    timeFormat === f && { fontFamily: 'Inter_700Bold' }]}>
                    {f === '12h' ? t.settings.time12h : t.settings.time24h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <RowSep colors={colors} />

        {/* Font size — شريط تمرير */}
        <SRow colors={colors} styles={styles} icon="text-outline" iconColor="#3b82f6"
          title={t.settings.fontSize} value={fontLabel}
          expanded={openSection === 'font'} onPress={() => toggleSection('font')} />
        {openSection === 'font' && (
          <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
            <FontSlider value={fontSizePercent} onChange={setFontSizePercent} colors={colors} isRTL={isRTL} />
            {/* معاينة سريعة */}
            <View style={{ backgroundColor: colors.muted, borderRadius: moderateScale(10), padding: moderateScale(12), marginTop: 4 }}>
              <Text style={{ color: colors.foreground, fontSize: 14 * fontMultiplier, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
                معاينة حجم الخط الحالي
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 * fontMultiplier, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4 }}>
                مستخرج الحضور — {fontSizePercent}%
              </Text>
            </View>
          </View>
        )}
        <RowSep colors={colors} />

        {/* Language */}
        <SRow colors={colors} styles={styles} icon="globe-outline" iconColor="#3b82f6"
          title={t.settings.language} value={language === 'ar' ? 'العربية' : 'English'}
          expanded={openSection === 'lang'} onPress={() => toggleSection('lang')} />
        {openSection === 'lang' && (
          <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
            <View style={styles.chipRow}>
              {([['ar','العربية'],['en','English']] as ['ar'|'en', string][]).map(([l, label]) => (
                <TouchableOpacity key={l}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted },
                    language === l && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setLanguage(l)}
                >
                  <Text style={[styles.chipText, { color: language === l ? colors.primaryForeground : colors.mutedForeground },
                    language === l && { fontFamily: 'Inter_700Bold' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <RowSep colors={colors} />

        {/* High contrast toggle */}
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="contrast-outline" size={moderateScale(18)} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>وضع عالي التباين</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              ألوان فاقعة — مناسب للأماكن المضيئة وضوء الشمس
            </Text>
          </View>
          <Switch value={highContrast} onValueChange={setHighContrast}
            trackColor={{ false: colors.muted, true: '#f59e0b' }}
            thumbColor={highContrast ? '#fff' : colors.mutedForeground} />
        </View>

      </View>


      {/* ══════════════ GROUP: التنبيهات ══════════════ */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
        {language === 'ar' ? 'التنبيهات' : 'Notifications'}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: '#f9731620' }]}>
            <Ionicons name="notifications-outline" size={moderateScale(18)} color="#f97316" />
          </View>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t.settings.notifications}</Text>
          <Switch value={notifEnabled} onValueChange={toggleNotifications}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={notifEnabled ? colors.primaryForeground : colors.mutedForeground} />
        </View>

        {notifEnabled && (
          <>
            <RowSep colors={colors} />
            <View style={styles.settingsRow}>
              <View style={[styles.rowIcon, { backgroundColor: '#f9731620' }]}>
                <Ionicons name="alarm-outline" size={moderateScale(18)} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t.settings.earlyReminder}</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t.settings.earlyReminderSub}</Text>
              </View>
              <Switch value={earlyReminder} onValueChange={setEarlyReminder}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={earlyReminder ? colors.primaryForeground : colors.mutedForeground} />
            </View>
            <RowSep colors={colors} />
            {/* ── المنبّه الصاخب ─────────────────────────────────────────── */}
            <View style={styles.settingsRow}>
              <View style={[styles.rowIcon, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="alarm-outline" size={moderateScale(18)} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>المنبّه الصاخب</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  ينبّه قبل كل دخول (شفت واحد + شفتين) — فقط الدخول
                </Text>
              </View>
              <Switch value={alarmBeforeShift} onValueChange={setAlarmBeforeShift}
                trackColor={{ false: colors.muted, true: '#ef4444' }}
                thumbColor={alarmBeforeShift ? '#fff' : colors.mutedForeground} />
            </View>
            {alarmBeforeShift && (
              <View style={[{ backgroundColor: '#ef444410', marginHorizontal: moderateScale(14), marginBottom: moderateScale(10), borderRadius: moderateScale(10), padding: moderateScale(10), flexDirection: 'row', alignItems: 'flex-start', gap: moderateScale(8) }]}>
                <Ionicons name="warning-outline" size={moderateScale(16)} color="#ef4444" style={{ marginTop: 1 }} />
                <Text style={[styles.rowSub, { color: '#ef4444', flex: 1, lineHeight: moderateScale(18) }]}>
                  سيُرسل إشعار صاخب كل 5 ثوانٍ طوال 15 دقيقة قبل موعد الدخول.{'\n'}
                  لا يمكن إيقافه إلا من هذه الإعدادات.
                </Text>
              </View>
            )}
            <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
              <View style={[styles.scheduleBox, { borderColor: colors.border }]}>
                {(notifShift === 'single'
                  ? [{ time: '11:45 — 12:00 م', label: 'موعد بصمة الدخول', icon: 'alarm-outline' as const }]
                  : [
                      { time: '8:45 — 9:00 ص',  label: 'دخول الشفت الأول',   icon: 'alarm-outline' as const },
                      { time: '3:45 — 4:00 م',   label: 'دخول الشفت الثاني', icon: 'alarm-outline' as const },
                    ]
                ).map((s, i, arr) => (
                  <View key={i} style={[styles.schedItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[styles.schedIcon, { backgroundColor: alarmBeforeShift ? '#ef444415' : colors.muted + '30' }]}>
                      <Ionicons name={s.icon} size={moderateScale(14)} color={alarmBeforeShift ? '#ef4444' : colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.schedTime, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{s.time}</Text>
                      <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{s.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: moderateScale(8) }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, borderColor: colors.primary + '50', backgroundColor: colors.primary + '12' }, testingSend && { opacity: 0.6 }]}
                  onPress={handleTestNotification} disabled={testingSend}
                >
                  {testingSend
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Ionicons name="paper-plane-outline" size={moderateScale(16)} color={colors.primary} />}
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                    {testingSend ? t.settings.sendingNotif : t.settings.testNotif}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, backgroundColor: colors.primary, borderColor: colors.primary }, saving && { opacity: 0.7 }]}
                  onPress={handleSave} disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                    : <Ionicons name="checkmark-circle" size={moderateScale(16)} color={colors.primaryForeground} />}
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
                    {t.settings.saveNotifSettings}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>

      {/* ══════════════ GROUP: الأمان ══════════════ */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
        {language === 'ar' ? 'الأمان والقفل' : 'Security & Lock'}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="finger-print-outline" size={moderateScale(18)} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t.settings.biometric}</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {biometricEnabled ? t.settings.biometricNoteActive : t.settings.biometricNote}
            </Text>
          </View>
          <Switch value={biometricEnabled} onValueChange={biometricAvailable ? toggleBiometric : undefined}
            disabled={!biometricAvailable}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={biometricEnabled ? colors.primaryForeground : colors.mutedForeground} />
        </View>
        <RowSep colors={colors} />
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="keypad-outline" size={moderateScale(18)} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t.settings.pin}</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {pinEnabled ? t.settings.pinOn : t.settings.pinOff}
            </Text>
          </View>
          {pinEnabled ? (
            <View style={{ flexDirection: 'row', gap: moderateScale(6) }}>
              <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]} onPress={() => router.push('/pin-setup')}>
                <Ionicons name="create-outline" size={moderateScale(15)} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]} onPress={handleDisablePIN}>
                <Ionicons name="close-outline" size={moderateScale(15)} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => { setPinEnabled(false); router.push('/pin-setup'); }}>
              <Ionicons name="add-outline" size={moderateScale(15)} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══════════════ GROUP: التخزين والبيانات ══════════════ */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
        {language === 'ar' ? 'التخزين والبيانات' : 'Storage & Data'}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* إحصاء الصور + شريط المساحة */}
        <View style={[styles.rowExpand, { borderTopWidth: 0, paddingTop: moderateScale(14) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(10), marginBottom: moderateScale(10) }}>
            <View style={[styles.rowIcon, { backgroundColor: '#8b5cf620' }]}>
              {loadingStorage
                ? <ActivityIndicator size="small" color="#8b5cf6" />
                : <Ionicons name="images-outline" size={moderateScale(18)} color="#8b5cf6" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>مساحة الصور</Text>
              {storageStats ? (
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {storageStats.count} صورة بصمة — {storageStats.totalMB} MB
                </Text>
              ) : (
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>جارٍ الحساب...</Text>
              )}
            </View>
            <TouchableOpacity onPress={loadStorageStats} style={[styles.miniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="refresh-outline" size={moderateScale(15)} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* شريط المساحة البصري */}
          {storageStats && (
            <View style={{ gap: 6, marginBottom: moderateScale(10) }}>
              <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${storageFillPct}%` as any, backgroundColor: storageColor, borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: storageColor, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{storageStats.totalMB} MB مستخدمة</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>{storageLimitLabel}</Text>
              </View>
              {/* اختيار الحد الأقصى للمساحة */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {([500, 1000, 2000, -1] as const).map(mb => (
                  <TouchableOpacity key={mb}
                    style={[{ paddingHorizontal: moderateScale(10), paddingVertical: 5, borderRadius: moderateScale(8), borderWidth: 1 },
                      maxStorageMB === mb
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => setMaxStorageMB(mb)}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold',
                      color: maxStorageMB === mb ? colors.primaryForeground : colors.mutedForeground }}>
                      {mb === -1 ? '∞' : mb >= 1000 ? `${mb / 1000}GB` : `${mb}MB`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* تنظيف الصور القديمة */}
          <View style={{ flexDirection: 'row', gap: moderateScale(8), alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowSub, { color: colors.mutedForeground, marginBottom: 4 }]}>احذف صور أقدم من:</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {([3, 6, 12] as const).map(m => (
                  <TouchableOpacity key={m}
                    style={[{ paddingHorizontal: moderateScale(10), paddingVertical: 5, borderRadius: moderateScale(8), borderWidth: 1 },
                      cleanMonths === m ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => setCleanMonths(m)}
                  >
                    <Text style={{ color: cleanMonths === m ? '#fff' : colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{m}ش</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef444415', borderColor: '#ef444440' }, cleaningImages && { opacity: 0.6 }]}
              onPress={handleCleanImages} disabled={cleaningImages}
            >
              {cleaningImages
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Ionicons name="trash-outline" size={moderateScale(15)} color="#ef4444" />}
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>تنظيف</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RowSep colors={colors} />

        {/* الحذف التلقائي للسجلات */}
        <SRow colors={colors} styles={styles} icon="trash-outline" iconColor="#ef4444"
          title={t.settings.autoDelete}
          value={autoDeleteMonths === 0 ? t.settings.autoDeleteOff : t.settings.autoDeleteMonths(autoDeleteMonths)}
          expanded={openSection === 'delete'} onPress={() => toggleSection('delete')} />
        {openSection === 'delete' && (
          <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
            <View style={styles.chipRow}>
              {([0,3,6,12] as const).map(m => (
                <TouchableOpacity key={m}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted },
                    autoDeleteMonths === m && { backgroundColor: m === 0 ? colors.primary : '#ef4444', borderColor: m === 0 ? colors.primary : '#ef4444' }]}
                  onPress={() => handleAutoDelete(m)}
                >
                  <Text style={[styles.chipText, { color: autoDeleteMonths === m ? '#fff' : colors.mutedForeground },
                    autoDeleteMonths === m && { fontFamily: 'Inter_700Bold' }]}>
                    {m === 0 ? t.settings.autoDeleteOff : t.settings.autoDeleteMonths(m)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <RowSep colors={colors} />

        {/* حفظ نسخة بيانات فقط */}
        <TouchableOpacity style={[styles.settingsRow, { opacity: backingUp ? 0.6 : 1 }]} onPress={handleBackup} disabled={backingUp}>
          <View style={[styles.rowIcon, { backgroundColor: '#3b82f620' }]}>
            {backingUp ? <ActivityIndicator size="small" color="#3b82f6" /> : <Ionicons name="save-outline" size={moderateScale(18)} color="#3b82f6" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>نسخة احتياطية (بيانات)</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>يحفظ السجلات فقط — بدون صور</Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(16)} color={colors.mutedForeground} />
        </TouchableOpacity>

        <RowSep colors={colors} />

        {/* حفظ نسخة شاملة مع الصور */}
        <TouchableOpacity style={[styles.settingsRow, { opacity: backingUpFull ? 0.6 : 1 }]} onPress={handleFullBackup} disabled={backingUpFull}>
          <View style={[styles.rowIcon, { backgroundColor: '#8b5cf620' }]}>
            {backingUpFull ? <ActivityIndicator size="small" color="#8b5cf6" /> : <Ionicons name="archive-outline" size={moderateScale(18)} color="#8b5cf6" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>نسخة شاملة (مع الصور)</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {backingUpFull ? `جارٍ الحفظ... ${backupProgress}%` : `يشمل جميع صور البصمة (${storageStats?.totalMB ?? '?'} MB)`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(16)} color={colors.mutedForeground} />
        </TouchableOpacity>

        <RowSep colors={colors} />

        {/* استيراد نسخة احتياطية */}
        <TouchableOpacity style={[styles.settingsRow, { opacity: restoring ? 0.6 : 1 }]} onPress={handleRestore} disabled={restoring}>
          <View style={[styles.rowIcon, { backgroundColor: '#22c55e20' }]}>
            {restoring ? <ActivityIndicator size="small" color="#22c55e" /> : <Ionicons name="cloud-upload-outline" size={moderateScale(18)} color="#22c55e" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>استيراد نسخة احتياطية</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>استعد سجلاتك من ملف نسخة محفوظة سابقاً</Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(16)} color={colors.mutedForeground} />
        </TouchableOpacity>

      </View>

      {/* ══════════════ GROUP: عن التطبيق ══════════════ */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
        {language === 'ar' ? 'عن التطبيق' : 'About'}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: '#8b5cf620' }]}>
            <Ionicons name="information-circle-outline" size={moderateScale(18)} color="#8b5cf6" />
          </View>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t.settings.about}</Text>
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{CURRENT_VERSION}</Text>
        </View>
        <RowSep colors={colors} />
        <SRow colors={colors} styles={styles} icon="wifi-outline" iconColor="#8b5cf6"
          title={t.settings.offline} expanded={openSection === 'offline'} onPress={() => toggleSection('offline')} />
        {openSection === 'offline' && (
          <View style={[styles.rowExpand, { borderTopColor: colors.border }]}>
            <Text style={[styles.rowSub, { color: colors.mutedForeground, lineHeight: moderateScale(22) }]}>
              {t.settings.offlineInfo}
            </Text>
          </View>
        )}
      </View>

      {/* ══════════════ GROUP: أدوات المطور ══════════════ */}
      {Constants.expoConfig?.extra?.appVariant === 'development' && (
        <>
          <Text style={[styles.groupLabel, { color: '#f97316' }]}>🔧 أدوات المطور</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: '#f97316', borderWidth: 1.5 }]}>
            <View style={styles.settingsRow}>
              <View style={[styles.rowIcon, { backgroundColor: '#f9731620' }]}>
                <Ionicons name={isFrozen ? 'pause-circle' : 'play-circle-outline'} size={moderateScale(18)} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>تجميد التحديثات</Text>
                <Text style={[styles.rowSub, { color: isFrozen ? '#f97316' : colors.mutedForeground }]}>
                  {isFrozen ? '🔒 مجمّد' : 'التحديثات تعمل بشكل طبيعي'}
                </Text>
              </View>
              <Switch value={isFrozen} onValueChange={handleToggleFreeze}
                trackColor={{ false: colors.border, true: '#f97316' }} thumbColor="#fff" />
            </View>
          </View>
        </>
      )}

      {/* ══ زر التحديث ══ */}
      <TouchableOpacity
        style={[styles.updateBtn, { backgroundColor: updateBtnConfig.bg },
          (updateStatus === 'checking' || updateStatus === 'downloading') && { opacity: 0.75 }]}
        onPress={handleCheckUpdate}
        disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
      >
        {(updateStatus === 'checking' || updateStatus === 'downloading')
          ? <ActivityIndicator color="#fff" size="small" />
          : <Ionicons name={updateBtnConfig.icon} size={moderateScale(18)} color="#fff" />}
        <Text style={[styles.updateBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>{updateBtnConfig.label}</Text>
      </TouchableOpacity>

      <Text style={{ textAlign: 'center', color: colors.mutedForeground, fontSize: clampFont(13, 11, 15), fontFamily: 'Inter_500Medium', marginTop: moderateScale(6), letterSpacing: 0.3 }}>
        ✦ تصميم وتطوير{' '}
        <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold' }}>عمرو الكثيري</Text>
        {' '}✦
      </Text>

    </ScrollView>
    {updateInfo && (
      <AppUpdateModal
        visible={showUpdateModal}
        info={updateInfo}
        onDismiss={() => { setShowUpdateModal(false); setUpdateInfo(null); }}
      />
    )}
    </View>
  );
}

function SRow({ colors, styles, icon, iconColor, title, sub, value, expanded, onPress }: {
  colors: any; styles: any; icon: string; iconColor: string; title: string;
  sub?: string; value?: string; expanded?: boolean; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={moderateScale(18)} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
        {!!sub && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text>}
      </View>
      {!!value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={moderateScale(16)} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function RowSep({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: moderateScale(60) }} />;
}

function createStyles(mul: number = 1) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container:   { flex: 1 },
    content:     { paddingHorizontal: spacing.lg, gap: moderateScale(4) },
    headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: moderateScale(8) },
    iconBtn:     { width: moderateScale(40), height: moderateScale(40), alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(20) },
    title:       { fontSize: clampFont(20, 17, 24) * mul },
    groupLabel:  { fontSize: fs.xs, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginTop: moderateScale(14), marginBottom: moderateScale(5), marginLeft: moderateScale(4) },
    groupCard:   { borderRadius: moderateScale(14), borderWidth: 1, overflow: 'hidden' },
    settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(13), gap: moderateScale(12) },
    rowIcon:     { width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(9), alignItems: 'center', justifyContent: 'center' },
    rowTitle:    { fontSize: fs.base, fontFamily: 'Inter_500Medium' },
    rowSub:      { fontSize: fs.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
    rowValue:    { fontSize: fs.sm, fontFamily: 'Inter_400Regular' },
    rowExpand:   { paddingHorizontal: moderateScale(14), paddingBottom: moderateScale(14), paddingTop: moderateScale(12), borderTopWidth: 1, gap: moderateScale(10) },
    chipRow:     { flexDirection: 'row', gap: moderateScale(8), flexWrap: 'wrap' },
    chip:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: moderateScale(10), borderRadius: moderateScale(10), borderWidth: 1 },
    chipText:    { fontSize: fs.sm, fontFamily: 'Inter_500Medium' },
    scheduleBox: { borderRadius: moderateScale(10), borderWidth: 1, overflow: 'hidden' },
    schedItem:   { flexDirection: 'row', alignItems: 'center', gap: moderateScale(10), paddingVertical: moderateScale(8), paddingHorizontal: moderateScale(10) },
    schedIcon:   { width: moderateScale(30), height: moderateScale(30), borderRadius: moderateScale(8), alignItems: 'center', justifyContent: 'center' },
    schedTime:   { fontSize: fs.base },
    actionBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(10), paddingVertical: moderateScale(11), paddingHorizontal: moderateScale(14), gap: moderateScale(7), borderWidth: 1 },
    actionBtnText: { fontSize: fs.sm, fontFamily: 'Inter_600SemiBold' },
    miniBtn:     { width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(9), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    updateBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(12), paddingVertical: moderateScale(13), gap: moderateScale(8), marginTop: moderateScale(10) },
    updateBtnText: { fontSize: fs.base },
  });
}
