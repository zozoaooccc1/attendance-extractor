import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { useAttendance } from '@/context/AttendanceContext';
import { useEmployee } from '@/context/EmployeeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ShiftType } from '@/constants/types';
import { isFridayDate } from '@/constants/scheduleConfig';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';

// ── Smart duration formatter ──────────────────────────────────────────────────
function formatSmartDuration(totalMinutes: number): { value: string; unit: string } {
  if (totalMinutes <= 0) return { value: '0', unit: 'دقيقة' };
  if (totalMinutes < 60) return { value: String(totalMinutes), unit: 'دقيقة' };
  const totalHours = Math.floor(totalMinutes / 60);
  const remainMins = totalMinutes % 60;
  if (totalHours < 24) {
    const display = remainMins > 0
      ? `${totalHours}:${String(remainMins).padStart(2, '0')}`
      : String(totalHours);
    return { value: display, unit: 'ساعة' };
  }
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const unit = days === 1 ? 'يوم' : days === 2 ? 'يومان' : 'أيام';
  const value = remHours > 0 ? `${days} و ${remHours}س` : String(days);
  return { value, unit };
}

// ── Scheduled entry time in minutes from midnight ─────────────────────────────
function getScheduledEntryMinutes(
  entryType: 'entry1' | 'entry2',
  shiftType: ShiftType,
  date: Date,
): number {
  if (isFridayDate(date)) return 14 * 60;
  if (shiftType === 'single') return 12 * 60;
  return entryType === 'entry1' ? 9 * 60 : 16 * 60;
}

// ── Row separator (identical to settings.tsx) ─────────────────────────────────
function RowSep({ colors }: { colors: any }) {
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: moderateScale(60) }} />
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EmployeeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontMultiplier } = useSettings();
  const { shiftType, setShiftType, getRecordForMonth, todayRecords } = useAttendance();
  const { employeeName, setEmployeeName, department, setDepartment } = useEmployee();
  const { t } = useLanguage();

  const fs = useMemo(() => buildFontSize(fontMultiplier), [fontMultiplier]);

  const [editingName, setEditingName] = useState(false);
  const [editingDept, setEditingDept] = useState(false);
  const [nameInput, setNameInput] = useState(employeeName);
  const [deptInput, setDeptInput] = useState(department);

  // ── Calculate late/bonus minutes for current month ─────────────────────────
  const { lateMinutes } = useMemo(() => {
    try {
      const now = new Date();
      const records = getRecordForMonth(now.getFullYear(), now.getMonth() + 1);
      let late = 0;
      for (const r of records) {
        if (r.type !== 'entry1' && r.type !== 'entry2') continue;
        if (!r.confirmedTime || !r.confirmedTime.includes(':')) continue;
        if (!r.shiftType) continue;
        const recordDate = new Date(r.createdAt);
        if (isNaN(recordDate.getTime())) continue;
        const scheduled = getScheduledEntryMinutes(r.type, r.shiftType, recordDate);
        const [h, m] = r.confirmedTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) continue;
        const actualMins = h * 60 + m;
        const diff = actualMins - scheduled;
        if (diff > 0) late += diff;
      }
      return { lateMinutes: late };
    } catch {
      return { lateMinutes: 0 };
    }
  }, [todayRecords, getRecordForMonth]);

  const handleShiftChange = (shift: ShiftType) => {
    if (todayRecords.length > 0) {
      Alert.alert(
        t.error,
        'لا يمكن تغيير نوع الدوام بعد تسجيل الحضور اليوم.'
      );
      return;
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setShiftType(shift);
  };

  const saveName = () => {
    setEmployeeName(nameInput.trim());
    setEditingName(false);
  };

  const saveDept = () => {
    setDepartment(deptInput.trim());
    setEditingDept(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const lateFmt = formatSmartDuration(lateMinutes);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + spacing.md,
        paddingBottom: insets.bottom + 120,
        paddingHorizontal: spacing.lg,
        gap: moderateScale(4),
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(10), marginBottom: moderateScale(14) }}>
        <View style={{
          width: moderateScale(40), height: moderateScale(40),
          borderRadius: moderateScale(12), backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="person" size={moderateScale(20)} color="#fff" />
        </View>
        <View>
          <Text style={{ fontSize: clampFont(20, 17, 24) * fontMultiplier, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
            {t.employee.title}
          </Text>
          <Text style={{ fontSize: fs.xs, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
            {t.employee.subtitle}
          </Text>
        </View>
      </View>

      {/* ── GROUP: المعلومات الشخصية ─────────────────────────────────────── */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{t.employee.personalInfo}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Name row */}
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="person-outline" size={moderateScale(18)} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t.employee.nameLabel}</Text>
            {editingName ? (
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                onBlur={saveName}
                onSubmitEditing={saveName}
                autoFocus
                style={[styles.inlineInput, { color: colors.foreground, borderColor: colors.primary }]}
                placeholder="أدخل اسمك الكامل"
                placeholderTextColor={colors.mutedForeground + '88'}
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity onPress={() => { setNameInput(employeeName); setEditingName(true); }} activeOpacity={0.7}>
                <Text style={[styles.rowTitle, {
                  color: employeeName ? colors.foreground : colors.mutedForeground + '88',
                  fontFamily: employeeName ? 'Inter_500Medium' : 'Inter_400Regular',
                }]}>
                  {employeeName || t.employee.namePlaceholder}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {editingName ? (
            <TouchableOpacity onPress={saveName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="checkmark-circle" size={moderateScale(22)} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setNameInput(employeeName); setEditingName(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={moderateScale(17)} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <RowSep colors={colors} />

        {/* Department row */}
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="business-outline" size={moderateScale(18)} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t.employee.deptLabel}</Text>
            {editingDept ? (
              <TextInput
                value={deptInput}
                onChangeText={setDeptInput}
                onBlur={saveDept}
                onSubmitEditing={saveDept}
                autoFocus
                style={[styles.inlineInput, { color: colors.foreground, borderColor: '#3b82f6' }]}
                placeholder="أدخل اسم القسم"
                placeholderTextColor={colors.mutedForeground + '88'}
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity onPress={() => { setDeptInput(department); setEditingDept(true); }} activeOpacity={0.7}>
                <Text style={[styles.rowTitle, {
                  color: department ? colors.foreground : colors.mutedForeground + '88',
                  fontFamily: department ? 'Inter_500Medium' : 'Inter_400Regular',
                }]}>
                  {department || t.employee.deptPlaceholder}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {editingDept ? (
            <TouchableOpacity onPress={saveDept} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="checkmark-circle" size={moderateScale(22)} color="#3b82f6" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setDeptInput(department); setEditingDept(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={moderateScale(17)} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* ── GROUP: نوع الدوام ─────────────────────────────────────────────── */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginTop: moderateScale(14) }]}>{t.employee.shiftType}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Shift info row */}
        <View style={styles.settingsRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons
              name={shiftType === 'single' ? 'sunny-outline' : 'layers-outline'}
              size={moderateScale(18)}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>
              {shiftType === 'single' ? t.settings.singleShift : t.settings.doubleShift}
            </Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {shiftType === 'single' ? t.employee.singleShiftSub : t.employee.doubleShiftSub}
            </Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary + '30',
          }]}>
            <Text style={[styles.statusBadgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              {t.employee.active}
            </Text>
          </View>
        </View>

        <RowSep colors={colors} />

        {/* Shift chips selector */}
        <View style={[styles.chipRow, { paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(12) }]}>
          {(['single', 'double'] as ShiftType[]).map(s => {
            const isActive = shiftType === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, {
                  backgroundColor: isActive ? colors.primary : 'transparent',
                  borderColor: isActive ? colors.primary : colors.border,
                }]}
                onPress={() => handleShiftChange(s)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={s === 'single' ? 'sunny-outline' : 'layers-outline'}
                  size={moderateScale(15)}
                  color={isActive ? '#fff' : colors.mutedForeground}
                />
                <Text style={[styles.chipText, {
                  color: isActive ? '#fff' : colors.mutedForeground,
                  fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                }]}>
                  {s === 'single' ? t.settings.singleShift : t.settings.doubleShift}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>

      {/* ── GROUP: إحصائيات الشهر ────────────────────────────────────────── */}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginTop: moderateScale(14) }]}>
        {t.employee.monthlyStats}
      </Text>
      {/* Late counter — full width */}
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: '#ef444420', alignSelf: 'flex-start' }]}>
          <Ionicons name="time-outline" size={moderateScale(18)} color="#ef4444" />
        </View>
        <Text style={[styles.rowSub, { color: colors.mutedForeground, marginTop: moderateScale(8) }]}>
          {t.employee.lateMinutes}
        </Text>
        <Text style={[styles.statValue, { color: '#ef4444', fontFamily: 'Inter_700Bold' }]}>
          {lateFmt.value}
        </Text>
        <Text style={[styles.statUnit, { color: '#ef444499', fontFamily: 'Inter_500Medium' }]}>
          {lateFmt.unit}
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: clampFont(12, 11, 13),
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: moderateScale(5),
    marginLeft: moderateScale(4),
  },
  groupCard: {
    borderRadius: moderateScale(14),
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(13),
    gap: moderateScale(12),
  },
  rowIcon: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: clampFont(14, 13, 16),
    fontFamily: 'Inter_500Medium',
  },
  rowSub: {
    fontSize: clampFont(12, 11, 13),
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  inlineInput: {
    fontSize: clampFont(14, 13, 16),
    fontFamily: 'Inter_500Medium',
    borderBottomWidth: 1.5,
    paddingBottom: 2,
    paddingTop: 0,
    minWidth: moderateScale(140),
  },
  statusBadge: {
    borderRadius: moderateScale(8),
    borderWidth: 1,
    paddingHorizontal: moderateScale(9),
    paddingVertical: moderateScale(4),
  },
  statusBadgeText: {
    fontSize: clampFont(11, 10, 13),
  },
  chipRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  chipText: {
    fontSize: clampFont(13, 12, 15),
  },
  statCard: {
    borderRadius: moderateScale(14),
    borderWidth: 1,
    padding: moderateScale(13),
  },
  statValue: {
    fontSize: clampFont(26, 22, 32),
    lineHeight: clampFont(32, 28, 38),
    marginTop: moderateScale(2),
  },
  statUnit: {
    fontSize: clampFont(12, 11, 14),
    marginTop: 2,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: moderateScale(8),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    marginTop: moderateScale(4),
  },
});
