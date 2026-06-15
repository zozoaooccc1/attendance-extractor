import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, TextInput, ScrollView,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { AttendanceRecord, RecordType, RECORD_LABELS } from '@/constants/types';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';
import { checkLateEntry } from '@/constants/scheduleConfig';

function parseDateStr(s: string) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function fmt(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function getWeekStart(dateStr: string): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return fmt(d);
}

function getWeekLabel(ws: string, months: string[]): string {
  const d = parseDateStr(ws);
  const end = new Date(d); end.setDate(end.getDate() + 6);
  return `${d.getDate()} ${months[d.getMonth()].slice(0,3)} — ${end.getDate()} ${months[end.getMonth()].slice(0,3)}`;
}

// هل اليوم فيه تأخير؟
function dayHasLate(records: AttendanceRecord[], date: string): boolean {
  const d = parseDateStr(date);
  return records.some(r => {
    if (r.type !== 'entry1' && r.type !== 'entry2') return false;
    const { isLate } = checkLateEntry(r.type as 'entry1'|'entry2', r.confirmedTime, d, r.shiftType);
    return isLate;
  });
}

type FilterType = 'all' | 'late' | 'month' | 'friday';
type SortOrder  = 'newest' | 'oldest';

type Styles = ReturnType<typeof createStyles>;

interface DayCardProps { date: string; records: AttendanceRecord[]; onPress: () => void; formatTime: (s:string)=>string; styles: Styles; }
function DayCard({ date, records, onPress, formatTime, styles }: DayCardProps) {
  const colors = useColors();
  const { t } = useSettings();
  const d = parseDateStr(date);
  const isFri = d.getDay() === 5;
  const types: RecordType[] = records.some(r => r.shiftType === 'double')
    ? ['entry1','exit1','entry2','exit2'] : ['entry1','exit1'];

  const lateNotes = useMemo(() => {
    return records
      .filter(r => (r.type === 'entry1' || r.type === 'entry2') && r.note?.trim())
      .filter(r => {
        const { isLate } = checkLateEntry(r.type as 'entry1' | 'entry2', r.confirmedTime, d, r.shiftType);
        return isLate;
      });
  }, [records, date]);

  const hasLateWithNote = lateNotes.length > 0;

  return (
    <TouchableOpacity
      style={[styles.dayCard, { backgroundColor: colors.card, borderColor: isFri ? '#f59e0b40' : colors.border }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <View style={[styles.dateBox, { backgroundColor: isFri ? '#f59e0b20' : colors.primary + '15' }]}>
        <Text style={[styles.dateDay, { color: isFri ? '#d97706' : colors.primary, fontFamily: 'Inter_700Bold' }]}>{d.getDate()}</Text>
        <Text style={[styles.dateMonth, { color: isFri ? '#d97706' : colors.primary, fontFamily: 'Inter_500Medium' }]}>
          {t.monthsShort[d.getMonth()].slice(0,3)}
        </Text>
        {hasLateWithNote && (
          <View style={styles.lateNoteBadge}>
            <Text style={styles.lateNoteBadgeText}>📝</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(6), marginBottom: moderateScale(5) }}>
          <Text style={[styles.dayName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {t.days[d.getDay()]}
            {isFri && <Text style={[styles.fridayText, { color: '#d97706' }]}> ({t.history.friday})</Text>}
          </Text>
          {hasLateWithNote && (
            <View style={styles.lateNoteChip}>
              <Text style={styles.lateNoteChipText}>⚠️ تأخر • ملاحظة مُرفقة</Text>
            </View>
          )}
        </View>
        <View style={styles.timesRow}>
          {types.map(type => {
            const rec = records.find(r => r.type === type);
            return (
              <View key={type} style={styles.timeItem}>
                <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{t.recordTypes[type]}</Text>
                {rec ? (
                  <View style={styles.timeWithBadge}>
                    <Text style={[styles.timeValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                      {formatTime(rec.confirmedTime)}
                    </Text>
                    <View style={[styles.dot, {
                      backgroundColor: rec.isManuallyEdited ? colors.primary : (rec.ocrConfidence ?? 0) >= 80 ? colors.success : colors.warning
                    }]} />
                    {(rec.type === 'entry1' || rec.type === 'entry2') && rec.note?.trim() && (() => {
                      const { isLate } = checkLateEntry(rec.type as 'entry1' | 'entry2', rec.confirmedTime, d, rec.shiftType);
                      return isLate;
                    })() && (
                      <View style={styles.lateNoteDot} />
                    )}
                  </View>
                ) : (
                  <Text style={[styles.timeValue, { color: colors.mutedForeground }]}>--:--</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={moderateScale(18)} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { allDates, getRecordForDate, refreshDates } = useAttendance();
  const { formatTime, fontMultiplier, t } = useSettings();
  const [search,     setSearch]     = useState('');
  const [grouped,    setGrouped]    = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOrder,  setSortOrder]  = useState<SortOrder>('newest');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  const [thisMonth, setThisMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });

  useFocusEffect(useCallback(() => {
    refreshDates();
    const now = new Date();
    setThisMonth(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  }, [refreshDates]));

  const filtered = useMemo(() => {
    let dates = [...allDates];

    // البحث النصي: تاريخ + اسم يوم + ملاحظات السجلات
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      dates = dates.filter(d => {
        if (d.includes(q)) return true;
        if (t.days[parseDateStr(d).getDay()].includes(q)) return true;
        // بحث في ملاحظات السجلات
        const recs = getRecordForDate(d);
        return recs.some(r => r.note?.toLowerCase().includes(q));
      });
    }

    // الفلاتر
    if (filterType === 'late') {
      dates = dates.filter(d => {
        const recs = getRecordForDate(d);
        return dayHasLate(recs, d);
      });
    } else if (filterType === 'month') {
      dates = dates.filter(d => d.startsWith(thisMonth));
    } else if (filterType === 'friday') {
      dates = dates.filter(d => parseDateStr(d).getDay() === 5);
    }

    // الترتيب
    if (sortOrder === 'oldest') dates = dates.slice().reverse();

    return dates;
  }, [allDates, search, filterType, sortOrder, t.days, thisMonth]);

  const weeks = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, string[]>();
    for (const d of filtered) {
      const ws = getWeekStart(d);
      if (!map.has(ws)) map.set(ws, []);
      map.get(ws)!.push(d);
    }
    return Array.from(map.entries()).sort((a,b) =>
      sortOrder === 'oldest' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])
    );
  }, [filtered, grouped, sortOrder]);

  // شارة عدد التأخيرات
  const lateCount = useMemo(() => {
    return allDates.filter(d => dayHasLate(getRecordForDate(d), d)).length;
  }, [allDates]);

  const filterOptions: { key: FilterType; label: string; icon: string; count?: number }[] = [
    { key: 'all',    label: 'الكل',         icon: 'list-outline'         },
    { key: 'late',   label: 'تأخيرات',      icon: 'alert-circle-outline', count: lateCount },
    { key: 'month',  label: 'هذا الشهر',   icon: 'calendar-outline'     },
    { key: 'friday', label: 'الجمعة فقط',  icon: 'sunny-outline'        },
  ];

  const ListHeaderComponent = (
    <View style={{ gap: moderateScale(8), paddingBottom: moderateScale(4) }}>
      {/* شريط البحث */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={moderateScale(18)} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, flex: 1 }]}
          placeholder={t.history.searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={moderateScale(18)} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* شريط الفلاتر */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
        {filterOptions.map(opt => {
          const active = filterType === opt.key;
          return (
            <TouchableOpacity key={opt.key}
              style={[styles.filterChip,
                { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '18' : colors.card }]}
              onPress={() => setFilterType(opt.key)}
            >
              <Ionicons name={opt.icon as any} size={moderateScale(13)} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.mutedForeground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {opt.label}
              </Text>
              {opt.count !== undefined && opt.count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: active ? colors.primary : '#ef4444' }]}>
                  <Text style={styles.filterBadgeText}>{opt.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* أدوات التجميع + الترتيب */}
      <View style={{ flexDirection: 'row', gap: moderateScale(8) }}>
        <TouchableOpacity
          style={[styles.groupToggle, { flex: 1, backgroundColor: grouped ? colors.primary + '18' : colors.card, borderColor: grouped ? colors.primary : colors.border }]}
          onPress={() => setGrouped(v => !v)}
        >
          <Ionicons name="calendar-outline" size={moderateScale(15)} color={grouped ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.groupToggleText, { color: grouped ? colors.primary : colors.mutedForeground, fontFamily: grouped ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
            {t.history.groupByWeek}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.groupToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
        >
          <Ionicons name={sortOrder === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'} size={moderateScale(15)} color={colors.mutedForeground} />
          <Text style={[styles.groupToggleText, { color: colors.mutedForeground }]}>
            {sortOrder === 'newest' ? 'الأحدث' : 'الأقدم'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  type Item = { type: 'weekHeader'; ws: string } | { type: 'day'; date: string };

  const flatData: Item[] = useMemo(() => {
    if (!grouped || !weeks) {
      return filtered.map(d => ({ type: 'day' as const, date: d }));
    }
    const items: Item[] = [];
    for (const [ws, dates] of weeks) {
      items.push({ type: 'weekHeader', ws });
      for (const d of dates) items.push({ type: 'day', date: d });
    }
    return items;
  }, [filtered, grouped, weeks]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + spacing.md, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t.tabs.history}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{filtered.length} {t.history.day}</Text>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, i) => item.type === 'weekHeader' ? `wh-${item.ws}` : `d-${item.date}`}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={() => (
          <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
            <Ionicons name="search-outline" size={moderateScale(40)} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search || filterType !== 'all' ? t.history.noResults : t.history.noRecords}
            </Text>
          </Animated.View>
        )}
        renderItem={({ item, index }) => {
          if (item.type === 'weekHeader') {
            return (
              <View style={[styles.weekHeader, { borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={moderateScale(13)} color={colors.mutedForeground} />
                <Text style={[styles.weekHeaderText, { color: colors.mutedForeground }]}>
                  {getWeekLabel(item.ws, t.months)}
                </Text>
              </View>
            );
          }
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify().damping(16).stiffness(130)}>
              <DayCard
                date={item.date}
                records={getRecordForDate(item.date)}
                onPress={() => router.push({ pathname: '/day-detail', params: { date: item.date } })}
                formatTime={formatTime}
                styles={styles}
              />
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: moderateScale(12) },
    title: { fontSize: clampFont(26, 22, 32) * mul, lineHeight: clampFont(34, 28, 40) * mul },
    subtitle: { fontSize: fs.base, fontFamily: 'Inter_400Regular', marginTop: 2 },
    list: { paddingHorizontal: spacing.lg, paddingTop: moderateScale(8), gap: moderateScale(8) },
    searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(12), borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(9), gap: moderateScale(9) },
    searchInput: { fontSize: fs.base, fontFamily: 'Inter_400Regular' },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: moderateScale(20), borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(7) },
    filterChipText: { fontSize: fs.xs },
    filterBadge: { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
    filterBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
    groupToggle: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), borderRadius: moderateScale(10), borderWidth: 1, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(9) },
    groupToggleText: { fontSize: fs.sm },
    weekHeader: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(7), paddingVertical: moderateScale(8), borderBottomWidth: 1, marginBottom: moderateScale(4) },
    weekHeaderText: { fontSize: fs.xs, fontFamily: 'Inter_600SemiBold' },
    dayCard: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(13), gap: moderateScale(11) },
    dateBox: { width: moderateScale(46), height: moderateScale(50), borderRadius: moderateScale(10), alignItems: 'center', justifyContent: 'center' },
    dateDay: { fontSize: clampFont(18, 16, 22) * mul, lineHeight: clampFont(22, 20, 26) * mul },
    dateMonth: { fontSize: fs.xs },
    lateNoteBadge: { position: 'absolute', bottom: -6, right: -6, backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 2, paddingVertical: 1, borderWidth: 1, borderColor: '#fca5a5' },
    lateNoteBadgeText: { fontSize: 9 },
    lateNoteChip: { backgroundColor: '#fef2f2', borderRadius: moderateScale(6), paddingHorizontal: moderateScale(6), paddingVertical: 2, borderWidth: 1, borderColor: '#fca5a5' },
    lateNoteChipText: { fontSize: fs.xs, color: '#dc2626', fontFamily: 'Inter_500Medium' },
    lateNoteDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#dc2626', borderWidth: 1, borderColor: '#fca5a5' },
    cardContent: { flex: 1 },
    dayName: { fontSize: clampFont(14, 13, 16) * mul, marginBottom: 0 },
    fridayText: { fontSize: clampFont(11, 10, 13) * mul },
    timesRow: { flexDirection: 'row', gap: moderateScale(10), flexWrap: 'wrap' },
    timeItem: { gap: 2 },
    timeLabel: { fontSize: fs.xs, fontFamily: 'Inter_400Regular' },
    timeWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeValue: { fontSize: clampFont(13, 12, 15) * mul },
    dot: { width: 6, height: 6, borderRadius: 3 },
    empty: { alignItems: 'center', paddingTop: moderateScale(80), gap: moderateScale(12) },
    emptyText: { fontSize: fs.lg, fontFamily: 'Inter_500Medium' },
  });
}
