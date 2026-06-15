import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { AttendanceRecord } from '@/constants/types';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';


function isDayComplete(records: AttendanceRecord[]): boolean {
  const types = new Set(records.map(r => r.type));
  if (records.some(r => r.shiftType === 'double')) {
    return types.has('entry1') && types.has('exit1') && types.has('entry2') && types.has('exit2');
  }
  return types.has('entry1') && types.has('exit1');
}

function pad(n: number) { return String(n).padStart(2,'0'); }
function dateStr(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}`; }

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getRecordForDate, getRecordForMonth } = useAttendance();
  const { fontMultiplier, t } = useSettings();
  const { width: screenW } = useWindowDimensions();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  const hPad = spacing.lg;
  const gridWidth = screenW - hPad * 2 - moderateScale(20);
  const cellSize = Math.floor(gridWidth / 7);
  const cellHeight = Math.max(cellSize, moderateScale(44));

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [dayMap, setDayMap] = useState<Record<string, AttendanceRecord[]>>({});

  const loadMonth = useCallback(() => {
    const monthRecords = getRecordForMonth(year, month + 1);
    const map: Record<string, AttendanceRecord[]> = {};
    // تجميع السجلات حسب التاريخ في الذاكرة بدلاً من استعلام كل يوم على حدة
    for (const r of monthRecords) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    // ملء الأيام بدون سجلات بمصفوفة فارغة
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateStr(year, month, d);
      if (!map[key]) map[key] = [];
    }
    setDayMap(map);
  }, [year, month, getRecordForMonth]);

  useFocusEffect(useCallback(() => { loadMonth(); }, [loadMonth]));

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayFull = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;

  const cells: (number|null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function getDayStatus(d: number): 'complete' | 'partial' | 'none' | 'future' {
    const key = dateStr(year, month, d);
    const recs = dayMap[key] ?? [];
    if (recs.length === 0) return key <= todayFull ? 'none' : 'future';
    return isDayComplete(recs) ? 'complete' : 'partial';
  }

  const completeDays = Object.values(dayMap).filter(r => r.length > 0 && isDayComplete(r)).length;
  const partialDays = Object.values(dayMap).filter(r => r.length > 0 && !isDayComplete(r)).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + spacing.md }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t.tabs.calendar}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={moderateScale(22)} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {t.months[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={moderateScale(22)} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: t.calendar.complete, count: completeDays, color: colors.success, bg: colors.successBg },
            { label: t.calendar.partial, count: partialDays, color: colors.warning, bg: colors.warningBg },
            { label: t.calendar.noRecord, count: daysInMonth - completeDays - partialDays, color: colors.mutedForeground, bg: colors.muted },
          ].map(s => (
            <View key={s.label} style={[styles.statChip, { backgroundColor: s.bg }]}>
              <Text style={[styles.statNum, { color: s.color, fontFamily: 'Inter_700Bold' }]}>{s.count}</Text>
              <Text style={[styles.statLbl, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.grid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            {t.daysShort.map((d, i) => (
              <View key={d} style={[styles.dayHeader, { width: cellSize }]}>
                <Text style={[styles.dayHeaderText, {
                  color: i === 5 ? '#d97706' : colors.mutedForeground,
                  fontFamily: i === 5 ? 'Inter_700Bold' : 'Inter_400Regular',
                }]}>{d}</Text>
              </View>
            ))}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, w) => (
            <View key={w} style={styles.row}>
              {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
                if (!d) return <View key={i} style={[styles.dayCell, { width: cellSize, height: cellHeight }]} />;
                const key = dateStr(year, month, d);
                const status = getDayStatus(d);
                const isToday = key === todayFull;
                const dayOfWeek = new Date(year, month, d).getDay();
                const isFriday = dayOfWeek === 5;
                const hasRecords = (dayMap[key] ?? []).length > 0;
                const dotColor = status === 'complete' ? colors.success : status === 'partial' ? colors.warning : 'transparent';
                const cellBg = isToday ? colors.primary + '20' : isFriday ? '#f59e0b14' : 'transparent';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayCell, { width: cellSize, height: cellHeight, backgroundColor: cellBg, borderRadius: moderateScale(8) }]}
                    onPress={() => hasRecords && router.push({ pathname: '/day-detail', params: { date: key } })}
                    activeOpacity={hasRecords ? 0.7 : 1}
                  >
                    <Text style={[styles.dayNum, {
                      color: isToday ? colors.primary : isFriday ? '#d97706' : colors.foreground,
                      fontFamily: isToday || isFriday ? 'Inter_700Bold' : 'Inter_400Regular',
                    }]}>{d}</Text>
                    <View style={[styles.dot, { backgroundColor: dotColor, opacity: status === 'none' || status === 'future' ? 0 : 1 }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { color: colors.success, label: t.calendar.completeLabel },
            { color: colors.warning, label: t.calendar.partial },
            { color: '#d97706', label: t.calendar.fridayLabel },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
          <Text style={[styles.legendHint, { color: colors.mutedForeground }]}>{t.calendar.tapHint}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: moderateScale(12) },
    title: { fontSize: clampFont(26, 22, 32) * mul, lineHeight: clampFont(34, 28, 40) * mul },
    content: { paddingTop: moderateScale(8), gap: moderateScale(12) },
    monthNav: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(12) },
    navBtn: { padding: moderateScale(8) },
    monthTitle: { flex: 1, textAlign: 'center', fontSize: clampFont(17, 15, 20) * mul },
    statsRow: { flexDirection: 'row', gap: moderateScale(8) },
    statChip: { flex: 1, borderRadius: moderateScale(12), padding: moderateScale(11), alignItems: 'center', gap: 4 },
    statNum: { fontSize: clampFont(20, 17, 26) * mul },
    statLbl: { fontSize: fs.xs, fontFamily: 'Inter_400Regular' },
    grid: { borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(10) },
    row: { flexDirection: 'row' },
    dayHeader: { alignItems: 'center', paddingVertical: moderateScale(7) },
    dayHeaderText: { fontSize: clampFont(10, 9, 12) * mul },
    dayCell: { alignItems: 'center', justifyContent: 'center', gap: 3 },
    dayNum: { fontSize: clampFont(13, 12, 15) * mul },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    legend: { borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(13), gap: moderateScale(7) },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
    legendDot: { width: moderateScale(9), height: moderateScale(9), borderRadius: 5 },
    legendText: { fontSize: fs.sm, fontFamily: 'Inter_400Regular' },
    legendHint: { fontSize: fs.xs, fontFamily: 'Inter_400Regular', marginTop: 4, textAlign: 'center' },
  });
}
