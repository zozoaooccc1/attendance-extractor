import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useColors } from '@/hooks/useColors';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { useEmployee } from '@/context/EmployeeContext';
import { AttendanceRecord, RECORD_LABELS, RecordType } from '@/constants/types';
import { getCompanyPeriod, shiftCompanyPeriod, CompanyPeriod } from '@/utils/timeService';
import { checkLateEntry, isFridayDate } from '@/constants/scheduleConfig';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const ARABIC_DAYS  = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

function groupByDate(records: AttendanceRecord[]): Map<string, AttendanceRecord[]> {
  const map = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    if (!map.has(r.date)) map.set(r.date, []);
    map.get(r.date)!.push(r);
  }
  return map;
}

function isDayComplete(recs: AttendanceRecord[]): boolean {
  const types = new Set(recs.map(r => r.type));
  if (recs.some(r => r.shiftType === 'double'))
    return types.has('entry1') && types.has('exit1') && types.has('entry2') && types.has('exit2');
  return types.has('entry1') && types.has('exit1');
}

function getLateEntries(records: AttendanceRecord[]): AttendanceRecord[] {
  return records.filter(r => {
    if (r.type !== 'entry1' && r.type !== 'entry2') return false;
    const date = (() => { const [y,m,d] = r.date.split('-').map(Number); return new Date(y,m-1,d); })();
    const { isLate } = checkLateEntry(r.type, r.confirmedTime, date, r.shiftType);
    return isLate;
  });
}

function getMostLateDay(records: AttendanceRecord[]): { dayName: string; count: number } | null {
  const counts: Record<number, number> = {};
  for (const r of getLateEntries(records)) {
    const [y,m,d] = r.date.split('-').map(Number);
    const dow = new Date(y,m-1,d).getDay();
    counts[dow] = (counts[dow] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  const [dow, count] = entries.sort((a,b) => Number(b[1])-Number(a[1]))[0];
  return { dayName: ARABIC_DAYS[Number(dow)], count: Number(count) };
}

// ── يُعيد السجلات المتأخرة التي تحتوي على ملاحظة ──────────────────────────
function getLateEntriesWithNote(records: AttendanceRecord[]): AttendanceRecord[] {
  return getLateEntries(records).filter(r => r.note?.trim());
}

function buildPdfHtml(records: AttendanceRecord[], period: CompanyPeriod, employeeName: string, department: string): string {
  const grouped = groupByDate(records);
  const dates = Array.from(grouped.keys()).sort();
  const complete = dates.filter(d => isDayComplete(grouped.get(d)!)).length;
  const pct = dates.length > 0 ? Math.round((complete / dates.length) * 100) : 0;
  const unsyncedCount = records.filter(r => !r.isSynced).length;
  const lateCount = getLateEntries(records).length;

  const rows = dates.map(date => {
    const recs = grouped.get(date)!;
    const [y,m,d] = date.split('-').map(Number);
    const dow = new Date(y,m-1,d).getDay();
    const isComp = isDayComplete(recs);
    const types: RecordType[] = ['entry1','exit1','entry2','exit2'];

    const cells = types.map(type => {
      const r = recs.find(x => x.type === type);
      if (!r) return `<td style="color:#aaa">—</td>`;
      const isLate = getLateEntries([r]).length > 0;
      const c = r.isSynced ? '#22c55e' : '#f59e0b';
      // تظهر الملاحظة فقط إذا كان السجل متأخراً
      const showNote = isLate && r.note?.trim();
      return `<td>
        <span style="color:${c};font-weight:600">${r.confirmedTime}</span>${isLate ? ' 🔴' : ''}${!r.isSynced ? ' ⚠' : ''}
        ${showNote ? `<br/><span style="color:#b45309;font-size:10px;font-style:italic">📝 سبب التأخير: ${r.note!.trim()}</span>` : ''}
      </td>`;
    }).join('');

    return `<tr style="${isComp ? '' : 'background:#fff8e7'}">
      <td style="font-weight:500">${date}</td><td>${ARABIC_DAYS[dow]}</td>${cells}
      <td style="text-align:center">${isComp ? '✅' : '⚠️'}</td>
    </tr>`;
  }).join('');

  // قسم ملاحظات التأخير الموحّد في آخر التقرير
  const lateWithNotes = getLateEntriesWithNote(records);
  const notesSection = lateWithNotes.length > 0 ? `
  <div style="margin-top:24px;border:1px solid #fca5a5;border-radius:10px;padding:14px;background:#fff7f7">
    <h3 style="color:#dc2626;margin:0 0 12px 0;font-size:15px">📝 ملاحظات التأخير (${lateWithNotes.length})</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#fee2e2">
        <th style="padding:8px;text-align:right;font-size:13px">التاريخ</th>
        <th style="padding:8px;text-align:right;font-size:13px">النوع</th>
        <th style="padding:8px;text-align:right;font-size:13px">الوقت</th>
        <th style="padding:8px;text-align:right;font-size:13px">سبب التأخير</th>
      </tr></thead>
      <tbody>${lateWithNotes.map(r => `
        <tr style="border-bottom:1px solid #fee2e2">
          <td style="padding:8px;font-size:12px">${r.date}</td>
          <td style="padding:8px;font-size:12px">${RECORD_LABELS[r.type]}</td>
          <td style="padding:8px;font-size:12px;color:#dc2626;font-weight:600">${r.confirmedTime}</td>
          <td style="padding:8px;font-size:12px;color:#b45309;font-style:italic">${r.note!.trim()}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : '';

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;margin:20px;direction:rtl}
    h1{color:#1d4ed8;font-size:22px}
    .meta{display:flex;gap:16px;flex-wrap:wrap;background:#eff6ff;border-radius:10px;padding:12px 16px;margin-bottom:16px}
    .meta-item{text-align:center}.meta-num{font-size:26px;font-weight:700;color:#1d4ed8}.meta-lbl{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1d4ed8;color:#fff;padding:10px;text-align:right}
    td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:right}
    .legend{margin-top:16px;font-size:12px}
  </style></head><body>
  <h1>تقرير الحضور</h1>
  ${employeeName ? `<p style="color:#1d4ed8;font-size:15px;font-weight:700;margin:4px 0">👤 ${employeeName}${department ? `  •  🏢 ${department}` : ''}</p>` : ''}
  <p style="color:#64748b;font-size:13px">فترة: ${period.label} | التصدير: ${new Date().toLocaleDateString('ar')}</p>
  <div class="meta">
    <div class="meta-item"><div class="meta-num">${pct}%</div><div class="meta-lbl">الالتزام</div></div>
    <div class="meta-item"><div class="meta-num" style="color:#16a34a">${complete}</div><div class="meta-lbl">مكتمل</div></div>
    <div class="meta-item"><div class="meta-num" style="color:#d97706">${dates.length-complete}</div><div class="meta-lbl">ناقص</div></div>
    <div class="meta-item"><div class="meta-num" style="color:#ef4444">${lateCount}</div><div class="meta-lbl">تأخر</div></div>
    ${lateWithNotes.length > 0 ? `<div class="meta-item"><div class="meta-num" style="color:#dc2626">${lateWithNotes.length}</div><div class="meta-lbl">📝 مع ملاحظة</div></div>` : ''}
    ${unsyncedCount > 0 ? `<div class="meta-item"><div class="meta-num" style="color:#f59e0b">${unsyncedCount}</div><div class="meta-lbl">⚠ غير مزامن</div></div>` : ''}
  </div>
  <table><thead><tr><th>التاريخ</th><th>اليوم</th><th>دخول1</th><th>خروج1</th><th>دخول2</th><th>خروج2</th><th>الحالة</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="7" style="text-align:center">لا توجد سجلات</td></tr>'}</tbody></table>
  <div class="legend">
    <span style="color:#22c55e">● مزامن</span>&nbsp;&nbsp;
    <span style="color:#f59e0b">⚠ غير مزامن</span>&nbsp;&nbsp;
    <span>🔴 تأخر</span>&nbsp;&nbsp;
    <span style="color:#b45309">📝 سبب التأخير</span>
  </div>
  ${notesSection}
  </body></html>`;
}

function buildCsv(records: AttendanceRecord[], period: CompanyPeriod, employeeName: string, department: string): string {
  const lines: string[] = [];
  if (employeeName) lines.push(`اسم الموظف,${employeeName}`);
  if (department)   lines.push(`القسم,${department}`);
  lines.push(`فترة دوام الشركة,${period.label}`, `تاريخ التصدير,${new Date().toLocaleDateString('ar')}`, '',
    'التاريخ,النوع,الوقت,مزامن,تأخر,سبب التأخير');
  const sorted = [...records].sort((a,b) => a.date.localeCompare(b.date));
  for (const r of sorted) {
    const [y,m,d] = r.date.split('-').map(Number);
    const entryTypes: ('entry1' | 'entry2')[] = ['entry1', 'entry2'];
    const isLateEntry = entryTypes.includes(r.type as 'entry1' | 'entry2');
    const { isLate } = isLateEntry
      ? checkLateEntry(r.type as 'entry1' | 'entry2', r.confirmedTime, new Date(y,m-1,d), r.shiftType)
      : { isLate: false };
    // الملاحظة تُضاف في CSV فقط إذا كان السجل متأخراً
    const noteCol = isLate && r.note?.trim() ? `"${r.note.trim().replace(/"/g, '""')}"` : '';
    lines.push([r.date, RECORD_LABELS[r.type], r.confirmedTime, r.isSynced ? 'نعم' : 'لا', isLate ? 'نعم' : 'لا', noteCol].join(','));
  }
  return lines.join('\n');
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getRecordForPeriod, getRecordsByMonth } = useAttendance();
  const { formatTime, fontMultiplier } = useSettings();
  const { employeeName, department } = useEmployee();
  const [loading, setLoading] = useState(false);
  const [exportMode, setExportMode] = useState<'period'|'month'>('period');
  const [period, setPeriod] = useState<CompanyPeriod>(getCompanyPeriod(new Date()));
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  const records = useMemo(() => {
    if (exportMode === 'month') return getRecordsByMonth(selYear, selMonth + 1);
    return getRecordForPeriod(period.startStr, period.endStr);
  }, [exportMode, period, selYear, selMonth]);

  const grouped    = useMemo(() => groupByDate(records), [records]);
  const dates      = useMemo(() => Array.from(grouped.keys()), [grouped]);
  const totalDays  = dates.length;
  const completeDays = useMemo(() => dates.filter(d => isDayComplete(grouped.get(d)!)).length, [dates, grouped]);
  const score      = totalDays > 0 ? Math.round((completeDays / totalDays) * 100) : 0;
  const lateEntries = useMemo(() => getLateEntries(records), [records]);
  const lateWithNotes = useMemo(() => getLateEntriesWithNote(records), [records]);
  const mostLateDay = useMemo(() => getMostLateDay(records), [records]);
  const unsyncedCount = records.filter(r => !r.isSynced).length;
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.destructive;
  const scoreBg    = score >= 80 ? colors.successBg : colors.warningBg;

  const handleExportPDF = async () => {
    if (Platform.OS === 'web') { Alert.alert('التصدير', 'متاح فقط على الجوال'); return; }
    if (!records.length) { Alert.alert('لا توجد سجلات'); return; }
    setLoading(true);
    try {
      const html = buildPdfHtml(records, period, employeeName, department);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      const pdfTitle = employeeName ? `تقرير ${employeeName} — ${period.label}` : `تقرير الحضور ${period.label}`;
      if (canShare) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: pdfTitle, UTI: 'com.adobe.pdf' });
      else Alert.alert('تم التصدير', uri);
    } catch { Alert.alert('خطأ', 'فشل التصدير'); }
    finally { setLoading(false); }
  };

  const handleShareWhatsApp = async () => {
    if (!records.length) { Alert.alert('لا توجد سجلات للمشاركة'); return; }
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

    // قسم أسباب التأخير — يُضاف فقط إذا كانت هناك ملاحظات على تأخرات
    const lateNotesLines = lateWithNotes.map(r =>
      `  🔴 ${r.date} | ${RECORD_LABELS[r.type]} ${r.confirmedTime}\n  📝 السبب: ${r.note!.trim()}`
    );

    const text = [
      `📋 *تقرير الحضور*`,
      employeeName ? `👤 الموظف: *${employeeName}*` : '',
      department   ? `🏢 القسم: ${department}` : '',
      `📅 الفترة: ${period.label}`,
      ``,
      `${scoreEmoji} نسبة الالتزام: *${score}%*`,
      `✅ أيام مكتملة: ${completeDays} من ${totalDays}`,
      lateEntries.length > 0 ? `⚠️ تأخرات: ${lateEntries.length}` : `✨ لا يوجد تأخرات`,
      unsyncedCount > 0 ? `🔄 غير مزامن: ${unsyncedCount}` : '',
      ``,
      `📸 إجمالي السجلات: ${records.length}`,
      // قسم أسباب التأخير
      ...(lateNotesLines.length > 0 ? [
        ``,
        `📝 *أسباب التأخير (${lateNotesLines.length}):*`,
        ...lateNotesLines,
      ] : []),
      ``,
      `_تم التصدير من تطبيق بصمتي_`,
    ].filter(Boolean).join('\n');

    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) { await Linking.openURL(url); return; }
    } catch {}
    if (Platform.OS !== 'web') {
      setLoading(true);
      try {
        const html = buildPdfHtml(records, period, employeeName, department);
        const { uri } = await Print.printToFileAsync({ html });
        const pdfTitle = employeeName ? `تقرير ${employeeName} — ${period.label}` : 'مشاركة تقرير الحضور';
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: pdfTitle });
      } catch { Alert.alert('تعذّر فتح واتساب'); }
      finally { setLoading(false); }
    } else { Alert.alert('واتساب غير مثبّت'); }
  };

  const handleExportCSV = async () => {
    if (Platform.OS === 'web') { Alert.alert('التصدير', 'متاح فقط على الجوال'); return; }
    if (!records.length) { Alert.alert('لا توجد سجلات'); return; }
    setLoading(true);
    try {
      const csv = buildCsv(records, period, employeeName, department);
      const namePart = employeeName ? `_${employeeName.replace(/\s/g, '_')}` : '';
      const filename = `بصمتي${namePart}_${period.label.replace(/\s/g, '_')}.csv`;
      if (!FileSystem.documentDirectory) { Alert.alert('خطأ', 'لا يمكن الوصول للتخزين'); setLoading(false); return; }
      const uri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, '\uFEFF' + csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: `سجلات الحضور — ${period.label}`, UTI: 'public.comma-separated-values-text' });
      else Alert.alert('تم التصدير', uri);
    } catch { Alert.alert('خطأ', 'فشل تصدير CSV'); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + spacing.md }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>التقارير</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([['period','فترة دوام الشركة'],['month','شهر محدد']] as const).map(([mode, label]) => (
            <TouchableOpacity key={mode} style={[styles.modeBtn, exportMode === mode && { backgroundColor: colors.primary }]} onPress={() => setExportMode(mode)}>
              <Text style={[styles.modeBtnText, { color: exportMode === mode ? colors.primaryForeground : colors.mutedForeground }, exportMode === mode && { fontFamily: 'Inter_700Bold' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {exportMode === 'period' ? (
          <View style={[styles.periodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setPeriod(p => shiftCompanyPeriod(p, -1))} style={styles.arrowBtn}>
              <Ionicons name="chevron-back" size={moderateScale(22)} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.periodLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{period.label}</Text>
              <Text style={[styles.periodHint, { color: colors.mutedForeground }]}>فترة دوام الشركة (26 → 25)</Text>
            </View>
            <TouchableOpacity onPress={() => setPeriod(p => shiftCompanyPeriod(p, 1))} style={styles.arrowBtn}>
              <Ionicons name="chevron-forward" size={moderateScale(22)} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.periodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => { if (selMonth===0){setSelYear(y=>y-1);setSelMonth(11);}else setSelMonth(m=>m-1); }} style={styles.arrowBtn}>
              <Ionicons name="chevron-back" size={moderateScale(22)} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.periodLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{ARABIC_MONTHS[selMonth]} {selYear}</Text>
              <Text style={[styles.periodHint, { color: colors.mutedForeground }]}>الشهر الميلادي</Text>
            </View>
            <TouchableOpacity onPress={() => { if (selMonth===11){setSelYear(y=>y+1);setSelMonth(0);}else setSelMonth(m=>m+1); }} style={styles.arrowBtn}>
              <Ionicons name="chevron-forward" size={moderateScale(22)} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {totalDays > 0 && (
          <View style={[styles.scoreCard, { backgroundColor: scoreBg, borderColor: scoreColor + '44' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(16) }}>
              <Text style={[styles.scorePct, { color: scoreColor, fontFamily: 'Inter_700Bold' }]}>{score}%</Text>
              <View>
                <Text style={[styles.scoreLabel, { color: scoreColor, fontFamily: 'Inter_700Bold' }]}>نسبة الالتزام</Text>
                <Text style={[styles.scoreSub, { color: scoreColor, opacity: 0.8 }]}>
                  {score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : 'يحتاج تحسين'}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: scoreColor + '33' }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { n: completeDays, l: 'مكتمل', c: colors.success },
                { n: totalDays - completeDays, l: 'ناقص', c: colors.warning },
                { n: lateEntries.length, l: 'تأخر', c: '#ef4444' },
              ].map(({ n, l, c }) => (
                <View key={l} style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.scoreNum, { color: c, fontFamily: 'Inter_700Bold' }]}>{n}</Text>
                  <Text style={[styles.scoreNumLabel, { color: colors.mutedForeground }]}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* بطاقة ملاحظات التأخير — تظهر فقط إذا كانت هناك ملاحظات */}
        {lateWithNotes.length > 0 && (
          <View style={[styles.lateNotesCard, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), marginBottom: moderateScale(10) }}>
              <Text style={{ fontSize: moderateScale(16) }}>📝</Text>
              <Text style={[styles.lateNotesTitle, { color: '#dc2626', fontFamily: 'Inter_700Bold' }]}>
                أسباب التأخير ({lateWithNotes.length})
              </Text>
            </View>
            {lateWithNotes.map((r, i) => (
              <View key={r.id} style={[styles.lateNoteItem, i < lateWithNotes.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#fee2e2' }]}>
                <View style={{ flexDirection: 'row', gap: moderateScale(8), alignItems: 'center' }}>
                  <Text style={[styles.lateNoteDate, { color: '#dc2626', fontFamily: 'Inter_600SemiBold' }]}>
                    🔴 {r.date} | {RECORD_LABELS[r.type]} {r.confirmedTime}
                  </Text>
                </View>
                <Text style={[styles.lateNoteText, { color: '#b45309' }]}>
                  📝 {r.note!.trim()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {mostLateDay && (
          <View style={[styles.insightCard, { backgroundColor: '#fef3c7', borderColor: '#f59e0b44' }]}>
            <Text style={styles.insightIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: '#92400e', fontFamily: 'Inter_700Bold' }]}>
                أكثر يوم تأخراً: {mostLateDay.dayName}
              </Text>
              <Text style={[styles.insightSub, { color: '#b45309' }]}>
                {mostLateDay.count} {mostLateDay.count === 1 ? 'مرة تأخر' : 'مرات تأخر'} في هذا اليوم
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: moderateScale(10) }}>
          {[
            { n: totalDays,      l: 'أيام مسجلة',    c: colors.primary },
            { n: records.length, l: 'إجمالي السجلات', c: colors.foreground },
            { n: unsyncedCount,  l: 'غير مزامن',      c: colors.warning },
          ].map(({ n, l, c }) => (
            <View key={l} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: c, fontFamily: 'Inter_700Bold' }]}>{n}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{l}</Text>
            </View>
          ))}
        </View>

        {unsyncedCount > 0 && (
          <View style={[styles.warnCard, { backgroundColor: colors.warningBg, borderColor: colors.warning + '44' }]}>
            <Ionicons name="alert-circle-outline" size={moderateScale(18)} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warning }]}>{unsyncedCount} سجل بدون مزامنة — يُنصح بالتحقق</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          onPress={handleExportPDF} disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
            <>
              <Ionicons name="document-text-outline" size={moderateScale(20)} color={colors.primaryForeground} />
              <Text style={[styles.exportText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>تصدير PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: '#25d366' }, loading && { opacity: 0.7 }]}
          onPress={handleShareWhatsApp} disabled={loading}
        >
          <Ionicons name="logo-whatsapp" size={moderateScale(20)} color="#fff" />
          <Text style={[styles.exportText, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>مشاركة على واتساب</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: '#16a34a' }, loading && { opacity: 0.7 }]}
          onPress={handleExportCSV} disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="grid-outline" size={moderateScale(20)} color="#fff" />
              <Text style={[styles.exportText, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>تصدير CSV / Excel</Text>
            </>
          )}
        </TouchableOpacity>

        {totalDays === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={moderateScale(36)} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد سجلات لهذه الفترة</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: moderateScale(12) },
    title: { fontSize: clampFont(26, 22, 32) * mul },
    content: { paddingHorizontal: spacing.lg, paddingTop: moderateScale(8), gap: moderateScale(12) },
    modeRow: { flexDirection: 'row', borderRadius: moderateScale(14), borderWidth: 1, padding: 4, gap: 4 },
    modeBtn: { flex: 1, paddingVertical: moderateScale(10), borderRadius: moderateScale(10), alignItems: 'center' },
    modeBtnText: { fontSize: fs.sm, fontFamily: 'Inter_500Medium' },
    periodCard: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(13) },
    arrowBtn: { padding: moderateScale(8) },
    periodLabel: { fontSize: clampFont(15, 13, 18) * mul, textAlign: 'center' },
    periodHint: { fontSize: fs.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
    scoreCard: { borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(16), gap: moderateScale(13) },
    scorePct: { fontSize: clampFont(42, 34, 52) * mul },
    scoreLabel: { fontSize: clampFont(16, 14, 20) * mul },
    scoreSub: { fontSize: fs.sm, fontFamily: 'Inter_400Regular', marginTop: 2 },
    divider: { height: 1 },
    scoreNum: { fontSize: clampFont(22, 18, 28) * mul },
    scoreNumLabel: { fontSize: fs.xs, fontFamily: 'Inter_400Regular' },
    lateNotesCard: { borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(14), gap: 0 },
    lateNotesTitle: { fontSize: clampFont(14, 13, 16) * mul },
    lateNoteItem: { paddingVertical: moderateScale(8), gap: moderateScale(4) },
    lateNoteDate: { fontSize: fs.xs },
    lateNoteText: { fontSize: fs.xs, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
    insightCard: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(13), gap: moderateScale(10) },
    insightIcon: { fontSize: moderateScale(22) },
    insightTitle: { fontSize: clampFont(14, 13, 16) * mul },
    insightSub: { fontSize: fs.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
    statBox: { flex: 1, borderRadius: moderateScale(13), borderWidth: 1, padding: moderateScale(12), alignItems: 'center', gap: 4 },
    statNum: { fontSize: clampFont(22, 18, 28) * mul },
    statLabel: { fontSize: fs.xs, textAlign: 'center' },
    warnCard: { flexDirection: 'row', alignItems: 'flex-start', gap: moderateScale(10), borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(13) },
    warnText: { flex: 1, fontSize: fs.sm, fontFamily: 'Inter_400Regular', lineHeight: moderateScale(20) },
    exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(16), paddingVertical: moderateScale(17), gap: moderateScale(10) },
    exportText: { fontSize: clampFont(15, 13, 18) * mul },
    emptyCard: { borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(30), alignItems: 'center', gap: 8 },
    emptyText: { fontSize: fs.md, fontFamily: 'Inter_500Medium' },
  });
}
