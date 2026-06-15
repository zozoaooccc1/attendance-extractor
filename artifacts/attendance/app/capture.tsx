import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  Platform, Alert, ScrollView, ActivityIndicator,
  Animated, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useAttendance } from '@/context/AttendanceContext';
import { useSettings } from '@/context/SettingsContext';
import { ShiftType, RecordType } from '@/constants/types';
import { saveImage, readImageAsBase64 } from '@/utils/imageStorage';
import { getOfficialTime, OfficialTime } from '@/utils/timeService';
import { checkLateEntry, isFridayDate } from '@/constants/scheduleConfig';
import { moderateScale, clampFont, spacing, buildFontSize } from '@/utils/responsive';

const CAMERA_GUIDE_KEY = 'attendance_camera_guide_v1';
const MIN_IMAGE_SIZE_BYTES = 15000;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

type CaptureStep = 'camera' | 'fetching' | 'confirm' | 'success';

// ── Camera Guide Modal ─────────────────────────────────────────────────────
function CameraGuideModal({ visible, onStart }: { visible: boolean; onStart: () => void }) {
  const colors = useColors();
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={{ flex: 1, backgroundColor: '#000000CC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', gap: 16 }}>
          <Text style={{ fontSize: moderateScale(20), fontFamily: 'Inter_700Bold', color: colors.foreground, textAlign: 'center' }}>
            📸 كيف تلتقط صورة جيدة
          </Text>
          {[
            { icon: 'scan-outline', color: '#3b82f6', title: 'مركّز الشاشة', desc: 'اجعل جهاز البصمة في وسط الإطار تماماً' },
            { icon: 'sunny-outline', color: '#f59e0b', title: 'إضاءة كافية', desc: 'تأكد من وجود إضاءة جيدة وتجنب الظلام' },
            { icon: 'hand-left-outline', color: '#22c55e', title: 'ثبّت يدك', desc: 'أمسك الهاتف بثبات تام لمنع الضبابية' },
            { icon: 'eye-outline', color: '#8b5cf6', title: 'تحقق من الوضوح', desc: 'تأكد أن رقم الوقت واضح ومقروء' },
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tip.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={tip.icon as any} size={moderateScale(18)} color={tip.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: moderateScale(14), fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{tip.title}</Text>
                <Text style={{ fontSize: moderateScale(12), color: colors.mutedForeground, marginTop: 2 }}>{tip.desc}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            onPress={onStart}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: moderateScale(16), fontFamily: 'Inter_700Bold' }}>
              فهمت — ابدأ التصوير
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CaptureScreen() {
  const colors       = useColors();
  const insets       = useSafeAreaInsets();
  const router       = useRouter();
  const { type, shiftType } = useLocalSearchParams<{ type: RecordType; shiftType: ShiftType }>();
  const { addRecord, isDbReady } = useAttendance();
  const { formatTime, fontMultiplier, t } = useSettings();

  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);

  const [step, setStep]                 = useState<CaptureStep>('camera');
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [officialTime, setOfficialTime] = useState<OfficialTime | null>(null);
  const [saving, setSaving]             = useState(false);
  const [progress, setProgress]         = useState(0);
  const [showCameraGuide, setShowCameraGuide] = useState(false);
  const [note, setNote]                 = useState('');


  const progressRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale   = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (step === 'camera') checkAndLaunchCamera();
  }, []);

  useEffect(() => {
    if (step === 'fetching') {
      setProgress(0);
      progressRef.current = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 80);
      return () => { if (progressRef.current) clearInterval(progressRef.current!); };
    }
  }, [step]);

  const showSuccessAndNavigate = () => {
    setStep('success');
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }),
    ]).start();
    navTimeoutRef.current = setTimeout(() => {
      Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => router.back());
    }, 1100);
  };

  // تنظيف المؤقتات عند إزالة المكون
  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const checkAndLaunchCamera = async () => {
    try {
      const guideShown = await AsyncStorage.getItem(CAMERA_GUIDE_KEY);
      if (!guideShown) { setShowCameraGuide(true); return; }
    } catch {}
    launchCamera();
  };

  const handleGuideStart = async () => {
    try { await AsyncStorage.setItem(CAMERA_GUIDE_KEY, '1'); } catch {}
    setShowCameraGuide(false);
    launchCamera();
  };

  const continueWithImage = async (uri: string) => {
    setImageUri(uri);
    setStep('fetching');
    const officialT = await getOfficialTime(3000);
    setOfficialTime(officialT);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(100);
    setTimeout(() => setStep('confirm'), 400);
  };

  const launchCamera = async () => {
    if (Platform.OS === 'web') { Alert.alert(t.capture.title, t.capture.webOnly); router.back(); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.capture.permissionTitle, t.capture.permissionMsg,
        [{ text: t.cancel, onPress: () => router.back() }, { text: t.capture.permissionAllow, onPress: launchCamera }]);
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.55, exif: false });
      if (result.canceled || !result.assets[0]) { router.back(); return; }
      const uri = result.assets[0].uri;
      Alert.alert(t.capture.confirmPhotoTitle, t.capture.confirmPhotoMsg, [
        { text: t.capture.retake, style: 'cancel', onPress: () => launchCamera() },
        { text: t.capture.yesContinue, onPress: async () => {
          try {
            const info = await FileSystem.getInfoAsync(uri);
            const size = (info.exists && 'size' in info) ? (info as any).size : 999999;
            if (size < MIN_IMAGE_SIZE_BYTES) {
              Alert.alert(t.capture.lowQualityTitle, t.capture.lowQualityMsg,
                [{ text: t.capture.retake, style: 'cancel', onPress: () => launchCamera() }, { text: t.capture.useAnyway, onPress: () => continueWithImage(uri) }]);
              return;
            }
          } catch {}
          continueWithImage(uri);
        }},
      ]);
    } catch { Alert.alert(t.error, t.capture.cameraError); router.back(); }
  };



  const handleConfirm = async () => {
    if (!imageUri || !officialTime) return;
    if (!isDbReady) { Alert.alert(t.error, 'قاعدة البيانات غير جاهزة، حاول مرة أخرى.'); return; }
    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const id = generateId();
      const savedPath = await saveImage(imageUri, id);
      const resolvedShift: ShiftType = (shiftType === 'single' || shiftType === 'double') ? shiftType : 'single';
      const rawType = Array.isArray(type) ? type[0] : (type as string);
      const resolvedType: RecordType = (rawType === 'entry1' || rawType === 'exit1' || rawType === 'entry2' || rawType === 'exit2') ? rawType as RecordType : 'entry1';

      const finalTime = officialTime.displayTime;

      addRecord({
        id, date: officialTime.displayDate, type: resolvedType, shiftType: resolvedShift,
        imagePath: savedPath, ocrTime: officialTime.displayTime, ocrConfidence: 100,
        confirmedTime: finalTime, isManuallyEdited: false,
        isSynced: officialTime.isSynced, createdAt: officialTime.time instanceof Date ? officialTime.time.getTime() : Number(officialTime.time),
        note: note.trim() || '',
      });

      const isEntry = (type as string) === 'entry1' || (type as string) === 'entry2';
      if (isEntry) {
        const entryType = (type as string) === 'entry1' ? 'entry1' : 'entry2';
        const { isLate, minutesLate, graceLimitStr } = checkLateEntry(entryType, finalTime, officialTime.time, resolvedShift);
        if (isLate) {
          showSuccessAndNavigate();
          setTimeout(() => Alert.alert('⚠️ تأخير في الدخول',
            `وقت الدخول: ${finalTime}\nالحد: ${graceLimitStr}\nالتأخير: ${minutesLate} دقيقة`), 1500);
          return;
        }
      }
      showSuccessAndNavigate();
    } catch (err) {
      Alert.alert(t.error, err instanceof Error ? err.message : t.capture.saveError);
      setSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const isSynced = officialTime?.isSynced ?? false;
  const timeColor = isSynced ? colors.success : colors.warning;

  if (step === 'success') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.successCircle, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={[styles.successText, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t.capture.success}</Text>
        </Animated.View>
      </View>
    );
  }

  if (step === 'camera') {
    return (
      <>
        <CameraGuideModal visible={showCameraGuide} onStart={handleGuideStart} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>{t.capture.fetchingTime}...</Text>
        </View>
      </>
    );
  }

  if (step === 'fetching') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewSmall} resizeMode="cover" />}
        <View style={[styles.fetchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.fetchTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t.capture.fetchingTime}</Text>
          <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.fetchHint, { color: colors.mutedForeground }]}>{t.capture.syncingTime}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + spacing.md, paddingBottom: insets.bottom + 40, paddingHorizontal: spacing.lg, gap: moderateScale(14) }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={moderateScale(24)} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {t.capture.title} {t.recordTypes[type as RecordType]}
        </Text>
        <View style={{ width: moderateScale(40) }} />
      </View>

      {imageUri && (
        <TouchableOpacity
          style={[styles.imageBox, { borderColor: colors.success }]}
          onPress={() => router.push({ pathname: '/image-view', params: { uri: imageUri } })}
        >
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          <View style={[styles.imageHint, { backgroundColor: colors.background + 'CC' }]}>
            <Ionicons name="expand-outline" size={moderateScale(16)} color={colors.foreground} />
            <Text style={[styles.imageHintText, { color: colors.foreground }]}>{t.recordDetail.viewPhoto}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── بطاقة الوقت الرسمي ─────────────────────────────────────────────── */}
      <View style={[styles.timeCard, { backgroundColor: colors.card, borderColor: timeColor + '88' }]}>
        <View style={[styles.syncBadge, { backgroundColor: isSynced ? colors.successBg : colors.warningBg }]}>
          <Ionicons name={isSynced ? 'wifi' : 'wifi-outline'} size={moderateScale(14)} color={timeColor} />
          <Text style={[styles.syncText, { color: timeColor, fontFamily: 'Inter_600SemiBold' }]}>
            {isSynced ? t.recordDetail.syncedNote : t.recordDetail.unsyncedNote}
          </Text>
        </View>
        <View style={styles.lockRow}>
          <Ionicons name="lock-closed" size={moderateScale(14)} color={timeColor} />
          <Text style={[styles.lockLabel, { color: timeColor, fontFamily: 'Inter_600SemiBold' }]}>
            {t.capture.lockedTime}
          </Text>
        </View>
        <Text style={[styles.timeDisplay, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          {officialTime ? formatTime(officialTime.displayTime) : '--:--'}
        </Text>
        <Text style={[styles.dateDisplay, { color: colors.mutedForeground }]}>{officialTime?.displayDate ?? ''}</Text>
        {!isSynced && (
          <View style={[styles.warnBox, { backgroundColor: colors.warningBg, borderColor: colors.warning + '44' }]}>
            <Ionicons name="alert-circle-outline" size={moderateScale(14)} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warning }]}>
            {isSynced ? t.recordDetail.syncedNote : t.capture.unsyncedWarning}
            </Text>
          </View>
        )}
      </View>


      {/* ── حقل الملاحظة ──────────────────────────────────────────────── */}
      <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.noteLabelRow}>
          <Ionicons name="create-outline" size={moderateScale(16)} color={colors.mutedForeground} />
          <Text style={[styles.noteLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
            {t.capture.noteOptional}
          </Text>
        </View>
        <TextInput
          style={[styles.noteInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          placeholder={t.capture.notePlaceholder}
          placeholderTextColor={colors.mutedForeground + '80'}
          value={note} onChangeText={setNote}
          multiline maxLength={200} textAlignVertical="top"
        />
        {note.length > 0 && (
          <Text style={[styles.noteCount, { color: colors.mutedForeground }]}>{note.length}/200</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, { backgroundColor: colors.success }, saving && { opacity: 0.7 }]}
        onPress={handleConfirm} disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : (
          <><Ionicons name="checkmark-circle" size={moderateScale(24)} color="#fff" />
          <Text style={[styles.confirmText, { fontFamily: 'Inter_700Bold' }]}>{t.capture.confirmTitle}</Text></>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.retakeBtn, { borderColor: colors.border }]}
        onPress={() => { setNote(''); setStep('camera'); launchCamera(); }}
      >
        <Ionicons name="camera-outline" size={moderateScale(20)} color={colors.foreground} />
        <Text style={[styles.retakeText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{t.capture.retake}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: moderateScale(16), padding: spacing.lg },
    centerText: { fontSize: fs.lg, fontFamily: 'Inter_400Regular' },
    successCircle: { alignItems: 'center', gap: moderateScale(16) },
    successEmoji: { fontSize: moderateScale(80) },
    successText: { fontSize: clampFont(22, 18, 28) * mul },
    previewSmall: { width: '100%', height: moderateScale(160), borderRadius: moderateScale(16) },
    fetchCard: { width: '100%', borderRadius: moderateScale(20), borderWidth: 1, padding: moderateScale(26), alignItems: 'center', gap: moderateScale(14) },
    fetchTitle: { fontSize: fs.xl },
    progressBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    fetchHint: { fontSize: fs.sm, textAlign: 'center', fontFamily: 'Inter_400Regular' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { width: moderateScale(40), height: moderateScale(40), alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(20) },
    headerTitle: { fontSize: fs.xl },
    imageBox: { borderRadius: moderateScale(16), overflow: 'hidden', borderWidth: 2, height: moderateScale(210), position: 'relative' },
    image: { width: '100%', height: '100%' },
    imageHint: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: moderateScale(10), gap: 6 },
    imageHintText: { fontSize: fs.sm, fontFamily: 'Inter_500Medium' },
    timeCard: { borderRadius: moderateScale(16), borderWidth: 1.5, padding: moderateScale(18), gap: moderateScale(10), alignItems: 'center' },
    syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(6), borderRadius: 20 },
    syncText: { fontSize: fs.xs },
    lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lockLabel: { fontSize: fs.sm },
    timeDisplay: { fontSize: clampFont(46, 36, 56) * mul, letterSpacing: 4 },
    dateDisplay: { fontSize: fs.base, fontFamily: 'Inter_400Regular' },
    warnBox: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: moderateScale(10), borderWidth: 1, padding: moderateScale(10), gap: 8, marginTop: 4 },
    warnText: { flex: 1, fontSize: fs.xs, fontFamily: 'Inter_400Regular', lineHeight: moderateScale(17) },

    noteCard: { borderRadius: moderateScale(16), borderWidth: 1, padding: moderateScale(14), gap: moderateScale(8) },
    noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    noteLabel: { fontSize: fs.sm },
    noteInput: { fontSize: fs.base, minHeight: moderateScale(72), paddingTop: 4 },
    noteCount: { fontSize: fs.xs, textAlign: 'left' },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(16), paddingVertical: moderateScale(17), gap: moderateScale(10) },
    confirmText: { fontSize: clampFont(17, 15, 20) * mul, color: '#fff' },
    retakeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: moderateScale(16), borderWidth: 1, paddingVertical: moderateScale(13), gap: 8 },
    retakeText: { fontSize: fs.md },
  });
}
