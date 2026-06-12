import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { AttendanceRecord, RecordType, RECORD_LABELS, RECORD_ORDER } from '@/constants/types';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function DayDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { getRecordForDate } = useAttendance();
  const { fontMultiplier } = useSettings();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  useEffect(() => {
    if (date) setRecords(getRecordForDate(date));
  }, [date]);

  const d = date ? (() => {
    const [y, m, day] = date.split('-').map(Number);
    return new Date(y, m - 1, day);
  })() : new Date();

  const shiftType = records[0]?.shiftType ?? 'single';
  const types: RecordType[] = shiftType === 'double' ? RECORD_ORDER : ['entry1', 'exit1'];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.md, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={moderateScale(24)} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerDate, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {`${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`}
          </Text>
          <Text style={[styles.headerDay, { color: colors.mutedForeground }]}>
            {ARABIC_DAYS[d.getDay()]}
          </Text>
        </View>
        <View style={{ width: moderateScale(40) }} />
      </View>

      {types.map(type => {
        const rec = records.find(r => r.type === type);
        const isEntry = type === 'entry1' || type === 'entry2';

        return (
          <TouchableOpacity
            key={type}
            style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => rec && router.push({ pathname: '/record-detail', params: { id: rec.id } })}
            disabled={!rec}
            activeOpacity={rec ? 0.7 : 1}
          >
            <View style={[styles.typeTag, { backgroundColor: isEntry ? colors.primary + '18' : colors.muted }]}>
              <Ionicons
                name={isEntry ? 'log-in-outline' : 'log-out-outline'}
                size={moderateScale(20)}
                color={isEntry ? colors.primary : colors.mutedForeground}
              />
            </View>

            <View style={styles.recordInfo}>
              <Text style={[styles.recordType, { color: colors.mutedForeground }]}>
                {RECORD_LABELS[type]}
              </Text>
              {rec ? (
                <View style={styles.timeRow}>
                  <Text style={[styles.recordTime, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                    {rec.confirmedTime}
                  </Text>
                  <View style={[styles.confDot, {
                    backgroundColor: rec.isManuallyEdited
                      ? colors.primary
                      : (rec.ocrConfidence ?? 0) >= 80 ? colors.success : colors.warning
                  }]} />
                  <Text style={[styles.confLabel, {
                    color: rec.isManuallyEdited ? colors.primary : (rec.ocrConfidence ?? 0) >= 80 ? colors.success : colors.warning
                  }]}>
                    {rec.isManuallyEdited ? 'يدوي' : (rec.ocrConfidence ?? 0) >= 80 ? 'ثقة عالية' : 'مراجعة'}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.noRecord, { color: colors.mutedForeground }]}>لا يوجد سجل</Text>
              )}
            </View>

            {rec && <Ionicons name="chevron-forward" size={moderateScale(18)} color={colors.mutedForeground} />}
          </TouchableOpacity>
        );
      })}

      {records.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={moderateScale(44)} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد سجلات لهذا اليوم</Text>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, gap: moderateScale(12) },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: moderateScale(8) },
    backBtn: { width: moderateScale(40), height: moderateScale(40), alignItems: 'center', justifyContent: 'center' },
    headerCenter: { alignItems: 'center' },
    headerDate: { fontSize: clampFont(17, 15, 20) * mul },
    headerDay: { fontSize: fs.base, fontFamily: 'Inter_400Regular', marginTop: 2 },
    recordCard: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(15), gap: moderateScale(13) },
    typeTag: { width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(12), alignItems: 'center', justifyContent: 'center' },
    recordInfo: { flex: 1 },
    recordType: { fontSize: fs.sm, fontFamily: 'Inter_500Medium', marginBottom: moderateScale(4) },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
    recordTime: { fontSize: clampFont(24, 20, 30) * mul, letterSpacing: 1 },
    confDot: { width: 7, height: 7, borderRadius: 3.5 },
    confLabel: { fontSize: fs.xs, fontFamily: 'Inter_500Medium' },
    noRecord: { fontSize: fs.base, fontFamily: 'Inter_400Regular' },
    empty: { alignItems: 'center', paddingTop: moderateScale(60), gap: moderateScale(12) },
    emptyText: { fontSize: fs.lg },
  });
}
