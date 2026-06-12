import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useColors } from '@/hooks/useColors';
import { AttendanceRecord, RECORD_LABELS } from '@/constants/types';
import { getRecordById } from '@/utils/database';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';

export default function RecordDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteRecord } = useAttendance();
  const { fontMultiplier } = useSettings();

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) setRecord(getRecordById(id));
  }, [id]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleDeleteAndRecapture = () => {
    if (!record) return;
    Alert.alert(
      'حذف الصورة وإعادة التصوير',
      `سيتم حذف سجل "${RECORD_LABELS[record.type]}" وفتح الكاميرا لإعادة التصوير. هل تريد المتابعة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف وإعادة التصوير',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const imagePath = deleteRecord(record.id);
              if (imagePath && Platform.OS !== 'web') {
                try { await FileSystem.deleteAsync(imagePath, { idempotent: true }); } catch {}
              }
              router.replace({ pathname: '/capture', params: { type: record.type, shiftType: record.shiftType } });
            } catch {
              Alert.alert('خطأ', 'فشل الحذف، حاول مجدداً');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteOnly = () => {
    if (!record) return;
    Alert.alert(
      'حذف السجل',
      `سيتم حذف سجل "${RECORD_LABELS[record.type]}" وصورته نهائياً. هل أنت متأكد؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const imagePath = deleteRecord(record.id);
              if (imagePath && Platform.OS !== 'web') {
                try { await FileSystem.deleteAsync(imagePath, { idempotent: true }); } catch {}
              }
              router.back();
            } catch {
              Alert.alert('خطأ', 'فشل الحذف، حاول مجدداً');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!record) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isHighConfidence = (record.ocrConfidence ?? 0) >= 80;

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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          تفاصيل السجل
        </Text>
        <View style={{ width: moderateScale(40) }} />
      </View>

      <TouchableOpacity
        style={[styles.imageContainer, { borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/image-view', params: { uri: record.imagePath } })}
      >
        <Image source={{ uri: record.imagePath }} style={styles.image} resizeMode="contain" />
        <View style={[styles.imageLabel, { backgroundColor: colors.background + 'EE' }]}>
          <Ionicons name="expand-outline" size={moderateScale(16)} color={colors.foreground} />
          <Text style={[styles.imageLabelText, { color: colors.foreground }]}>اضغط لتكبير الصورة</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow label="نوع السجل" value={RECORD_LABELS[record.type]} colors={colors} styles={styles} />
        <Divider colors={colors} styles={styles} />
        <InfoRow label="التاريخ" value={record.date} colors={colors} styles={styles} />
        <Divider colors={colors} styles={styles} />
        <InfoRow label="نوع الدوام" value={record.shiftType === 'single' ? 'شفت واحد' : 'شفتين'} colors={colors} styles={styles} />
        <Divider colors={colors} styles={styles} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الوقت المسجل</Text>
          <Text style={[styles.infoValueLarge, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {record.confirmedTime}
          </Text>
        </View>
      </View>

      <View style={[styles.confidenceCard, {
        backgroundColor: isHighConfidence ? colors.successBg : colors.warningBg,
        borderColor: isHighConfidence ? colors.success + '44' : colors.warning + '44',
      }]}>
        <Ionicons
          name={isHighConfidence ? 'checkmark-circle' : 'alert-circle'}
          size={moderateScale(22)}
          color={isHighConfidence ? colors.success : colors.warning}
        />
        <View>
          <Text style={[styles.confTitle, {
            color: isHighConfidence ? colors.success : colors.warning,
            fontFamily: 'Inter_600SemiBold',
          }]}>
            {isHighConfidence ? 'صورة مسجّلة بنجاح' : 'يحتاج مراجعة الصورة'}
          </Text>
          <Text style={[styles.confSubtitle, { color: colors.mutedForeground }]}>
            {record.isSynced ? 'وقت مزامن مع خادم NTP' : 'وقت الجهاز — غير مزامن ⚠'}
          </Text>
        </View>
      </View>

      <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.editHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#f97316' + '20' }]}>
            <Ionicons name="camera" size={moderateScale(18)} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.editTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              تعديل الصورة
            </Text>
            <Text style={[styles.editSub, { color: colors.mutedForeground }]}>
              يمكنك حذف البصمة وإعادة تصويرها
            </Text>
          </View>
        </View>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.recaptureBtn, { backgroundColor: '#f97316' }, deleting && { opacity: 0.6 }]}
            onPress={handleDeleteAndRecapture}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="camera-outline" size={moderateScale(18)} color="#fff" />
            )}
            <Text style={[styles.btnText, { fontFamily: 'Inter_600SemiBold' }]}>
              حذف وإعادة التصوير
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: '#ef4444' + '60', backgroundColor: '#ef444410' }, deleting && { opacity: 0.6 }]}
          onPress={handleDeleteOnly}
          disabled={deleting}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={moderateScale(18)} color="#ef4444" />
          <Text style={[styles.deleteBtnText, { fontFamily: 'Inter_600SemiBold', color: '#ef4444' }]}>
            حذف السجل فقط
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Divider({ colors, styles }: { colors: any; styles: Styles }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function InfoRow({ label, value, colors, styles }: { label: string; value: string; colors: any; styles: Styles }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{value}</Text>
    </View>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, gap: moderateScale(15) },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    backBtn: { width: moderateScale(40), height: moderateScale(40), alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: clampFont(17, 15, 20) * mul },
    imageContainer: { borderRadius: moderateScale(16), overflow: 'hidden', borderWidth: 1, height: moderateScale(220), position: 'relative' },
    image: { width: '100%', height: '100%' },
    imageLabel: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: moderateScale(10), gap: 6,
    },
    imageLabelText: { fontSize: fs.sm, fontFamily: 'Inter_500Medium' },
    infoCard: { borderRadius: moderateScale(16), borderWidth: 1, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(13) },
    infoLabel: { fontSize: fs.base, fontFamily: 'Inter_400Regular' },
    infoValue: { fontSize: fs.base },
    infoValueLarge: { fontSize: clampFont(22, 18, 28) * mul, letterSpacing: 1 },
    divider: { height: 1 },
    confidenceCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(15), gap: moderateScale(12) },
    confTitle: { fontSize: fs.md },
    confSubtitle: { fontSize: fs.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
    editCard: { borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(15), gap: moderateScale(12) },
    editHeader: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12) },
    iconBox: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(10), alignItems: 'center', justifyContent: 'center' },
    editTitle: { fontSize: fs.md },
    editSub: { fontSize: fs.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
    recaptureBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: moderateScale(8), paddingVertical: moderateScale(14), borderRadius: moderateScale(12),
    },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: moderateScale(8), paddingVertical: moderateScale(13), borderRadius: moderateScale(12), borderWidth: 1,
    },
    btnText: { color: '#fff', fontSize: fs.md },
    deleteBtnText: { fontSize: fs.md },
  });
}
