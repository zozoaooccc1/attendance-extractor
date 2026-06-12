import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, clampFont } from '@/utils/responsive';
import { type ChangelogItem } from '@/constants/changelog';

export type UpdatePhase = 'downloading' | 'ready' | 'applying' | 'error';

interface UpdateModalProps {
  visible: boolean;
  changelog: ChangelogItem | null;
  phase: UpdatePhase;
  onApplyNow: () => void;
  onApplyLater: () => void;
}

const TYPE_ICON = {
  new: 'sparkles-outline',
  fix: 'bug-outline',
  improve: 'trending-up-outline',
} as const;

const TYPE_COLOR = {
  new: '#1d4ed8',
  fix: '#16a34a',
  improve: '#d97706',
} as const;

export function UpdateModal({ visible, changelog, phase, onApplyNow, onApplyLater }: UpdateModalProps) {
  if (Platform.OS === 'web') return null;

  const progress = useRef(new Animated.Value(0)).current;
  const fakeAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      fakeAnim.current?.stop();
      progress.setValue(0);
      return;
    }
    if (phase === 'downloading') {
      progress.setValue(0);
      fakeAnim.current = Animated.timing(progress, {
        toValue: 85,
        duration: 10000,
        useNativeDriver: false,
      });
      fakeAnim.current.start();
    } else if (phase === 'ready' || phase === 'applying') {
      fakeAnim.current?.stop();
      Animated.timing(progress, {
        toValue: 100,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } else if (phase === 'error') {
      fakeAnim.current?.stop();
      progress.setValue(0);
    }
  }, [phase, visible]);

  const barWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const phaseLabel =
    phase === 'downloading' ? 'جارٍ تحميل التحديث...' :
    phase === 'applying'    ? 'جارٍ التطبيق، لحظة...' :
    phase === 'error'       ? 'تعذّر التحديث' :
                              'اكتمل التحميل ✓';

  const canDismiss = phase === 'ready' || phase === 'error';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? onApplyLater : undefined}
    >
      <View style={s.overlay}>
        <View style={s.card}>

          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="rocket-outline" size={moderateScale(32)} color="#1d4ed8" />
            </View>
            <Text style={s.title}>تحديث جديد متاح</Text>
            {changelog && (
              <Text style={s.version}>الإصدار {changelog.version} — {changelog.title}</Text>
            )}
          </View>

          {changelog && changelog.items.length > 0 && (
            <View style={s.changelogBox}>
              {changelog.items.map((item, i) => (
                <View key={i} style={s.changeRow}>
                  <Ionicons
                    name={TYPE_ICON[item.type]}
                    size={moderateScale(15)}
                    color={TYPE_COLOR[item.type]}
                  />
                  <Text style={s.changeText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          {phase !== 'error' && (
            <View style={s.progressSection}>
              <View style={s.trackContainer}>
                <Animated.View style={[s.bar, { width: barWidth }]} />
              </View>
              <Text style={s.phaseLabel}>{phaseLabel}</Text>
            </View>
          )}

          {phase === 'error' && (
            <Text style={s.errorText}>
              ⚠️ تعذّر التحديث، سيُطبَّق تلقائياً في المرة القادمة.
            </Text>
          )}

          {phase === 'ready' && (
            <View style={s.actions}>
              <TouchableOpacity style={s.updateBtn} onPress={onApplyNow}>
                <Ionicons name="refresh-outline" size={moderateScale(18)} color="#fff" />
                <Text style={s.updateText}>تطبيق الآن</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dismissBtn} onPress={onApplyLater}>
                <Text style={s.dismissText}>عند الفتح القادم</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'error' && (
            <TouchableOpacity style={s.dismissBtn} onPress={onApplyLater}>
              <Text style={s.dismissText}>إغلاق</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  header: { alignItems: 'center', gap: 8 },
  iconWrap: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    backgroundColor: '#1d4ed810',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: clampFont(20, 17, 24),
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  version: {
    fontSize: clampFont(13, 11, 15),
    color: '#64748b',
    textAlign: 'center',
  },
  changelogBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, gap: 10 },
  changeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  changeText: {
    fontSize: clampFont(13, 11, 15),
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
  progressSection: { gap: 8 },
  trackContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
  },
  phaseLabel: {
    fontSize: clampFont(12, 10, 14),
    color: '#64748b',
    textAlign: 'center',
  },
  errorText: {
    fontSize: clampFont(13, 11, 15),
    color: '#dc2626',
    textAlign: 'center',
  },
  actions: { gap: 10 },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 14,
  },
  updateText: {
    color: '#fff',
    fontSize: clampFont(16, 14, 18),
    fontWeight: '700',
  },
  dismissBtn: { alignItems: 'center', paddingVertical: 10 },
  dismissText: { fontSize: clampFont(14, 12, 16), color: '#94a3b8' },
});
