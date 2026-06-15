import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Alert, LayoutAnimation, UIManager, Animated,
} from 'react-native';
import Animated2, { FadeInDown, FadeIn } from 'react-native-reanimated';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { ShiftType, RecordType, AttendanceRecord, RECORD_LABELS, RECORD_ORDER } from '@/constants/types';
import { getCompanyPeriod } from '@/utils/timeService';
import { isFridayDate, getExpectedExitTime, getNextEntryTime, formatEntryTime, formatCountdown, checkLateEntry, getEarliestExitCapture, formatTimeHHMM } from '@/constants/scheduleConfig';
import { calculateStreak } from '@/utils/streak';
import { moderateScale, clampFont, spacing, buildFontSize, isSmallScreen } from '@/utils/responsive';


type Styles = ReturnType<typeof createStyles>;

interface RecordRowProps {
  type: RecordType;
  record?: AttendanceRecord;
  onCapture: (t: RecordType) => void;
  onView: (r: AttendanceRecord) => void;
  formatTime: (s: string) => string;
  fontMul: number;
  styles: Styles;
}
function RecordRow({ type, record, onCapture, onView, formatTime, fontMul, styles }: RecordRowProps) {
  const colors = useColors();
  const { t } = useSettings();
  const isEntry = type === 'entry1' || type === 'entry2';
  return (
    <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.typeTag, { backgroundColor: isEntry ? colors.primary + '18' : colors.accent }]}>
        <Ionicons name={isEntry ? 'log-in-outline' : 'log-out-outline'} size={moderateScale(16)}
          color={isEntry ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.typeText, { color: isEntry ? colors.primary : colors.mutedForeground }]}>
          {t.recordTypes[type]}
        </Text>
      </View>
      {record ? (
        <TouchableOpacity style={styles.recordInfo} onPress={() => onView(record)}>
          <Text style={[styles.recordTime, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: clampFont(20, 16, 24) * fontMul }]}>
            {formatTime(record.confirmedTime)}
          </Text>
          <View style={styles.badgeRow}>
            {!record.isSynced && (
              <View style={[styles.badge, { backgroundColor: colors.warningBg }]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>{t.today.notSynced}</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: record.isSynced ? colors.successBg : colors.warningBg }]}>
              <View style={[styles.dot, { backgroundColor: record.isSynced ? colors.success : colors.warning }]} />
              <Text style={[styles.badgeText, { color: record.isSynced ? colors.success : colors.warning }]}>
                {record.isSynced ? t.today.confirmed : t.today.needsReview}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.captureBtn, { backgroundColor: colors.primary }]} onPress={() => onCapture(type)}>
          <Ionicons name="camera" size={moderateScale(17)} color={colors.primaryForeground} />
          <Text style={[styles.captureBtnText, { color: colors.primaryForeground }]}>{t.today.capture}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface SchedItemProps { label: string; time: string; grace?: string; countdown?: string; colors: any; isEntry?: boolean; styles: Styles; }
function SchedItem({ label, time, grace, countdown, colors, isEntry, styles }: SchedItemProps) {
  return (
    <View style={[styles.schedItem, { backgroundColor: isEntry ? colors.primary + '12' : colors.muted }]}>
      <Text style={[styles.schedLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.schedTime, { color: isEntry ? colors.primary : colors.foreground, fontFamily: 'Inter_700Bold' }]}>{time}</Text>
      {grace && <Text style={[styles.schedGrace, { color: colors.warning }]}>{grace}</Text>}
      {countdown && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, backgroundColor: '#f97316' + '18', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: moderateScale(10), color: '#ea580c' }}>⏳</Text>
          <Text style={{ fontSize: moderateScale(11), fontWeight: '700', color: '#ea580c' }}>{countdown}</Text>
        </View>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayRecords, shiftType, setShiftType, refreshToday, allDates, getRecordForMonth } = useAttendance();
  const { formatTime, fontMultiplier, t } = useSettings();
  const [now, setNow] = useState(new Date());
  const [countdown, setCountdown] = useState('');
  const [entryCountdown, setEntryCountdown] = useState('');
  const [entryTargetLabel, setEntryTargetLabel] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(true);

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      // مؤقت الخروج
      const exitTime = getExpectedExitTime(shiftType, n);
      setCountdown(formatCountdown(exitTime.getTime() - n.getTime()));
      // مؤقت الدخول
      const entryTime = getNextEntryTime(shiftType, n);
      setEntryCountdown(formatCountdown(entryTime.getTime() - n.getTime()));
      setEntryTargetLabel(formatEntryTime(entryTime));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [shiftType]);

  useFocusEffect(useCallback(() => {
    refreshToday();
    setNow(new Date());
  }, [refreshToday]));

  const isFriday = isFridayDate(now);

  useEffect(() => {
    if (isFriday && shiftType !== 'single') {
      setShiftType('single');
    }
  }, [isFriday, shiftType]);

  // Feature 3: Count late entries this month
  const monthLateCount = useMemo(() => {
    try {
      const n = new Date();
      const records = getRecordForMonth(n.getFullYear(), n.getMonth() + 1);
      let lateCount = 0;
      for (const r of records) {
        if (r.type === 'entry1' || r.type === 'entry2') {
          const { isLate } = checkLateEntry(r.type, r.confirmedTime, new Date(r.createdAt), r.shiftType);
          if (isLate) lateCount++;
        }
      }
      return lateCount;
    } catch { return 0; }
  }, [todayRecords, getRecordForMonth]);

  const sorted = [...todayRecords].sort((a, b) => RECORD_ORDER.indexOf(a.type) - RECORD_ORDER.indexOf(b.type));
  const get = (t: RecordType) => sorted.find(r => r.type === t);
  const required: RecordType[] = shiftType === 'double' ? ['entry1','exit1','entry2','exit2'] : ['entry1','exit1'];
  const done = required.filter(t => get(t)).length;
  const isComplete = done === required.length;
  const hasEntry = !!get('entry1');

  const streak = calculateStreak(allDates);
  const period = getCompanyPeriod(now);
  const waitingForEntry2 = shiftType === 'double' && !!get('entry1') && !get('entry2');

  const handleCapture = async (type: RecordType) => {
    // Block exit capture until 15 min before scheduled exit time
    if (type === 'exit1' || type === 'exit2') {
      const current = new Date();
      const earliest = getEarliestExitCapture(type, shiftType, current);
      if (current < earliest) {
        const diffMs = earliest.getTime() - current.getTime();
        const diffMin = Math.ceil(diffMs / 60000);
        const allowedFrom = formatTimeHHMM(earliest);
        Alert.alert(
          '⏰ مبكر جداً',
          `لا يمكن تسجيل الخروج قبل انتهاء الدوام.\n\n✅ يُسمح بالتصوير اعتباراً من: ${allowedFrom}\n⏳ الوقت المتبقي: ${diffMin} دقيقة`
        );
        return;
      }
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/capture', params: { type, shiftType } });
  };

  const handleShiftChange = (shift: ShiftType) => {
    if (isFriday) { Alert.alert('يوم الجمعة', 'يوم الجمعة دائماً شفت واحد — لا يمكن تغييره.'); return; }
    if (todayRecords.length > 0) { Alert.alert(t.error, 'لا يمكن تغيير نوع الدوام بعد تسجيل الحضور.'); return; }
    Haptics.selectionAsync();
    setShiftType(shift);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + spacing.md, paddingBottom: insets.bottom + 110, paddingHorizontal: spacing.lg, gap: moderateScale(11) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.dateBadge, {
          backgroundColor: isFriday ? '#f59e0b' : colors.primary,
        }]}>
          <Text style={[styles.dateNum, { color: '#fff' }]}>{now.getDate()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) }}>
            <Text style={[styles.dayName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {t.days[now.getDay()]}
            </Text>
            {isFriday && (
              <View style={[styles.fridayBadge, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b50' }]}>
                <Text style={[styles.fridayBadgeText, { color: '#d97706' }]}>{t.today.fridayBadge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.fullDate, { color: colors.mutedForeground }]}>
            {`${now.getDate()} ${t.months[now.getMonth()]} ${now.getFullYear()}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: moderateScale(8), alignItems: 'center' }}>
          {streak >= 3 && (
            <View style={[styles.streakBadge, { backgroundColor: '#f97316' + '20', borderColor: '#f97316' + '40' }]}>
              <Text style={[styles.streakText, { color: '#ea580c' }]}>🔥 {streak}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={moderateScale(20)} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      {(done > 0 || required.length > 0) && (
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {t.today.progress}
            </Text>
            <Text style={[styles.progressCount, {
              color: isComplete ? colors.success : done > 0 ? colors.warning : colors.mutedForeground,
              fontFamily: 'Inter_700Bold',
            }]}>
              {done} / {required.length}
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressBarFill, {
              width: `${(done / required.length) * 100}%` as any,
              backgroundColor: isComplete ? colors.success : done > 0 ? colors.warning : colors.muted,
            }]} />
          </View>
          {isComplete && (
            <Text style={[styles.progressDone, { color: colors.success }]}>✅ {t.today.allComplete}</Text>
          )}
        </View>
      )}

      {/* مؤقت قبل انتهاء الدوام */}
      {hasEntry && !isComplete && (
        <Animated2.View entering={FadeInDown.duration(400).springify()}>
          <View style={[styles.timerCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <View style={styles.timerLeft}>
              <View style={[styles.timerIconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="hourglass-outline" size={moderateScale(20)} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.timerLabel, { color: colors.primary }]}>⏱️ قبل انتهاء الدوام</Text>
                <Text style={[styles.timerSub, { color: colors.primary + 'AA' }]}>{t.today.timeToExit}</Text>
              </View>
            </View>
            <Text style={[styles.timerValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {countdown}
            </Text>
          </View>
        </Animated2.View>
      )}

      {/* Period badge */}
      <View style={[styles.periodBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="calendar-outline" size={moderateScale(14)} color={colors.primary} />
        <Text style={[styles.periodText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
          {t.today.companyPeriod} {period.label}
        </Text>
      </View>

      {/* Feature 3: Late warning banner */}
      {monthLateCount >= 3 && (
        <View style={[styles.lateBanner, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}>
          <Ionicons name="warning-outline" size={moderateScale(18)} color="#ef4444" />
          <Text style={[styles.lateBannerText, { color: '#ef4444', fontFamily: 'Inter_600SemiBold' }]}>
            ⚠️ لديك {monthLateCount} تأخيرات هذا الشهر
          </Text>
        </View>
      )}

      {/* Shift selector */}
      {!isFriday ? (
        <View style={[styles.shiftSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['single', 'double'] as ShiftType[]).map(s => (
            <TouchableOpacity key={s}
              style={[styles.shiftOption, shiftType === s && { backgroundColor: colors.primary }]}
              onPress={() => handleShiftChange(s)}
            >
              <Ionicons name={s === 'single' ? 'sunny-outline' : 'layers-outline'} size={moderateScale(16)}
                color={shiftType === s ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.shiftText, { color: shiftType === s ? colors.primaryForeground : colors.mutedForeground }]}>
                {s === 'single' ? t.today.singleShift : t.today.doubleShift}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.fridayScheduleCard, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b40' }]}>
          <Ionicons name="sunny" size={moderateScale(18)} color="#d97706" />
          <Text style={[styles.fridayScheduleText, { color: '#92400e' }]}>
            {t.today.fridaySchedule}
          </Text>
        </View>
      )}

      {/* Schedule info */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setScheduleOpen(v => !v); }}
        style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleHeaderLeft}>
            <Ionicons name="time-outline" size={moderateScale(15)} color={colors.primary} />
            <Text style={[styles.scheduleTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t.today.workSchedule}</Text>
          </View>
          <Ionicons name={scheduleOpen ? 'chevron-up' : 'chevron-down'} size={moderateScale(17)} color={colors.mutedForeground} />
        </View>
        {scheduleOpen && (
          <View style={styles.scheduleBody}>
            {isFriday ? (
              <View style={styles.scheduleRow}>
                <SchedItem label="الدخول" time="2:00 م" grace="سماح حتى 2:15 م" countdown={!hasEntry ? entryCountdown : undefined} colors={colors} isEntry styles={styles} />
                <SchedItem label="الخروج" time="12:00 ص" colors={colors} styles={styles} />
              </View>
            ) : shiftType === 'single' ? (
              <View style={styles.scheduleRow}>
                <SchedItem label="الدخول" time="12:00 م" grace="سماح حتى 12:15 م" countdown={!hasEntry ? entryCountdown : undefined} colors={colors} isEntry styles={styles} />
                <SchedItem label="الخروج" time="12:00 ص" colors={colors} styles={styles} />
              </View>
            ) : (
              <View style={{ gap: moderateScale(8) }}>
                <Text style={[styles.scheduleSubTitle, { color: colors.mutedForeground }]}>الشفت الأول</Text>
                <View style={styles.scheduleRow}>
                  <SchedItem label="دخول" time="9:00 ص" grace="سماح حتى 9:15 ص" countdown={!hasEntry ? entryCountdown : undefined} colors={colors} isEntry styles={styles} />
                  <SchedItem label="خروج" time="12:00 م" colors={colors} styles={styles} />
                </View>
                <Text style={[styles.scheduleSubTitle, { color: colors.mutedForeground, marginTop: 2 }]}>الشفت الثاني</Text>
                <View style={styles.scheduleRow}>
                  <SchedItem label="دخول" time="4:00 م" grace="سماح حتى 4:15 م" countdown={waitingForEntry2 ? entryCountdown : undefined} colors={colors} isEntry styles={styles} />
                  <SchedItem label="خروج" time="12:00 ص" colors={colors} styles={styles} />
                </View>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Records */}
      <Animated2.Text entering={FadeIn.delay(80).duration(350)}
        style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
        {t.today.todayRecords}
      </Animated2.Text>
      {required.map((type, i) => (
        <Animated2.View key={type} entering={FadeInDown.delay(100 + i * 70).springify().damping(16).stiffness(130)}>
          <RecordRow type={type} record={get(type)} onCapture={handleCapture}
            onView={r => router.push({ pathname: '/record-detail', params: { id: r.id } })}
            formatTime={formatTime} fontMul={fontMultiplier} styles={styles} />
        </Animated2.View>
      ))}
    </ScrollView>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12) },
    dateBadge: { width: moderateScale(50), height: moderateScale(50), borderRadius: moderateScale(13), alignItems: 'center', justifyContent: 'center' },
    dateNum: { fontSize: clampFont(22, 18, 28) * mul, fontFamily: 'Inter_700Bold' },
    dayName: { fontSize: clampFont(20, 17, 24) * mul, lineHeight: clampFont(26, 22, 32) * mul },
    fridayBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
    fridayBadgeText: { fontSize: clampFont(11, 10, 13) * mul, fontFamily: 'Inter_700Bold' },
    fullDate: { fontSize: fs.sm, fontFamily: 'Inter_400Regular', marginTop: 2 },
    streakBadge: { borderRadius: moderateScale(10), borderWidth: 1, paddingHorizontal: moderateScale(9), paddingVertical: 4 },
    streakText: { fontSize: clampFont(13, 12, 15) * mul, fontFamily: 'Inter_700Bold' },
    settingsBtn: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(12), alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    progressCard: { borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(13), gap: moderateScale(8) },
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressLabel: { fontSize: fs.sm },
    progressCount: { fontSize: clampFont(15, 13, 17) * mul },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressDone: { fontSize: fs.sm, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
    countdownCard: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(12), borderWidth: 1, paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(10), gap: moderateScale(8) },
    countdownLabel: { fontSize: fs.sm, fontFamily: 'Inter_500Medium' },
    countdownValue: { fontSize: clampFont(15, 13, 17) * mul },
    periodBadge: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(7), borderRadius: moderateScale(10), borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(8) },
    periodText: { fontSize: fs.xs },
    lateBanner: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), borderRadius: moderateScale(12), borderWidth: 1, paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(10) },
    lateBannerText: { fontSize: fs.sm, fontFamily: 'Inter_600SemiBold', flex: 1 },
    shiftSelector: { flexDirection: 'row', borderRadius: moderateScale(14), borderWidth: 1, overflow: 'hidden' },
    shiftOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: moderateScale(13), gap: moderateScale(7), borderRadius: moderateScale(12), margin: 3 },
    shiftText: { fontSize: fs.base, fontFamily: 'Inter_600SemiBold' },
    fridayScheduleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(12), borderWidth: 1, padding: moderateScale(13), gap: moderateScale(10) },
    fridayScheduleText: { fontSize: fs.base, fontFamily: 'Inter_600SemiBold', flex: 1 },
    scheduleCard: { borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(13) },
    scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scheduleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(7) },
    scheduleTitle: { fontSize: fs.base },
    scheduleBody: { marginTop: moderateScale(12), gap: moderateScale(6) },
    scheduleSubTitle: { fontSize: fs.xs, fontFamily: 'Inter_500Medium' },
    scheduleRow: { flexDirection: 'row', gap: moderateScale(8) },
    schedItem: { flex: 1, borderRadius: moderateScale(10), padding: moderateScale(10), gap: 2 },
    schedLabel: { fontSize: fs.xs, fontFamily: 'Inter_400Regular' },
    schedTime: { fontSize: clampFont(15, 13, 17) * mul },
    schedGrace: { fontSize: clampFont(10, 9, 11) * mul, fontFamily: 'Inter_400Regular' },
    sectionTitle: { fontSize: fs.xs, textTransform: 'uppercase', letterSpacing: 1 },
    row: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(13), gap: moderateScale(10) },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(5), paddingVertical: moderateScale(6), paddingHorizontal: moderateScale(9), borderRadius: moderateScale(8), minWidth: isSmallScreen ? 74 : 84 },
    typeText: { fontSize: clampFont(12, 11, 14) * mul, fontFamily: 'Inter_600SemiBold' },
    recordInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recordTime: { letterSpacing: 1 },
    badgeRow: { flexDirection: 'row', gap: moderateScale(5) },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: moderateScale(7), paddingVertical: 3, borderRadius: 8 },
    dot: { width: 7, height: 7, borderRadius: 3.5 },
    badgeText: { fontSize: fs.xs, fontFamily: 'Inter_500Medium' },
    captureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: moderateScale(10), borderRadius: moderateScale(10), gap: moderateScale(6) },
    captureBtnText: { fontSize: fs.base, fontFamily: 'Inter_600SemiBold' },
    timerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: moderateScale(14), borderWidth: 1.5, paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(12) },
    timerLeft: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(10), flex: 1 },
    timerIconCircle: { width: moderateScale(38), height: moderateScale(38), borderRadius: moderateScale(19), alignItems: 'center', justifyContent: 'center' },
    timerLabel: { fontSize: clampFont(13, 12, 15) * mul, fontFamily: 'Inter_600SemiBold' },
    timerSub: { fontSize: clampFont(11, 10, 12) * mul, fontFamily: 'Inter_400Regular', marginTop: 2 },
    timerValue: { fontSize: clampFont(18, 15, 22) * mul, letterSpacing: 0.5 },
  });
}
