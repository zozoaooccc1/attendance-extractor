import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, clampFont } from '@/utils/responsive';

interface Props {
  visible: boolean;
  onRestore: () => Promise<void>;
  onSkip: () => void;
}

export function RestoreModal({ visible, onRestore, onSkip }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (Platform.OS === 'web' || !visible) return null;

  const handleRestore = async () => {
    setLoading(true);
    try {
      await onRestore();
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      setDone(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Icon */}
          <View style={s.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={moderateScale(40)} color="#1d4ed8" />
          </View>

          <Text style={s.title}>هل لديك نسخة احتياطية؟</Text>
          <Text style={s.sub}>
            يبدو أن هذا أول تشغيل للتطبيق.{'\n'}
            إذا كنت حذفت التطبيق سابقاً وعندك نسخة احتياطية محفوظة في التنزيلات، يمكنك استيرادها الآن.
          </Text>

          <View style={s.stepsBox}>
            {[
              { icon: 'folder-open-outline', text: 'سيفتح مستعرض المجلدات' },
              { icon: 'search-outline',      text: 'اختر مجلد التنزيلات' },
              { icon: 'sync-outline',         text: 'سيتم استيراد سجلاتك تلقائياً' },
            ].map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Ionicons name={step.icon as any} size={moderateScale(16)} color="#1d4ed8" />
                <Text style={s.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[s.restoreBtn, loading && { opacity: 0.7 }]}
            onPress={handleRestore}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : done ? (
              <><Ionicons name="checkmark-circle" size={moderateScale(20)} color="#fff" /><Text style={s.restoreBtnText}>تم الاستيراد ✅</Text></>
            ) : (
              <><Ionicons name="cloud-download-outline" size={moderateScale(20)} color="#fff" /><Text style={s.restoreBtnText}>استيراد من التنزيلات</Text></>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={onSkip} disabled={loading}>
            <Text style={s.skipText}>ابدأ بدون نسخة احتياطية</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000BB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', gap: 14, alignItems: 'center' },
  iconWrap: { width: moderateScale(72), height: moderateScale(72), borderRadius: moderateScale(36), backgroundColor: '#1d4ed810', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: clampFont(20, 17, 24), fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  sub: { fontSize: clampFont(13, 11, 15), color: '#64748b', textAlign: 'center', lineHeight: 20 },
  stepsBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, gap: 10, width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepText: { fontSize: clampFont(13, 11, 14), color: '#334155', flex: 1 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 14, width: '100%' },
  restoreBtnText: { color: '#fff', fontSize: clampFont(16, 14, 18), fontWeight: '700' },
  skipBtn: { paddingVertical: 10 },
  skipText: { fontSize: clampFont(14, 12, 16), color: '#94a3b8' },
});
