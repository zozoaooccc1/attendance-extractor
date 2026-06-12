import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, clampFont } from '@/utils/responsive';
import { type ChangelogItem } from '@/constants/changelog';

interface Props {
  visible: boolean;
  changelog: ChangelogItem | null;
  onDismiss: () => void;
}

const TYPE_CONFIG = {
  new:     { icon: 'sparkles-outline'    as const, color: '#1d4ed8', bg: '#1d4ed810', label: 'جديد'    },
  fix:     { icon: 'bug-outline'         as const, color: '#16a34a', bg: '#16a34a10', label: 'إصلاح'   },
  improve: { icon: 'trending-up-outline' as const, color: '#d97706', bg: '#d9770610', label: 'تحسين'   },
} as const;

export function ChangelogModal({ visible, changelog, onDismiss }: Props) {
  if (Platform.OS === 'web' || !visible || !changelog) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Text style={{ fontSize: moderateScale(32) }}>🎉</Text>
            </View>
            <Text style={s.title}>الجديد في الإصدار {changelog.version}</Text>
            <Text style={s.subtitle}>{changelog.title}</Text>
            <Text style={s.date}>{changelog.date}</Text>
          </View>

          {/* Changelog items */}
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {changelog.items.map((item, i) => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <View key={i} style={[s.item, { backgroundColor: cfg.bg }]}>
                  <View style={[s.badge, { backgroundColor: cfg.color }]}>
                    <Ionicons name={cfg.icon} size={moderateScale(12)} color="#fff" />
                    <Text style={s.badgeText}>{cfg.label}</Text>
                  </View>
                  <Text style={s.itemText}>{item.text}</Text>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={s.btn} onPress={onDismiss}>
            <Text style={s.btnText}>رائع، شكراً! 👍</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'flex-end', padding: 0 },
  card:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, width: '100%', maxHeight: '85%', gap: 16 },
  header:   { alignItems: 'center', gap: 4 },
  iconWrap: { width: moderateScale(64), height: moderateScale(64), borderRadius: moderateScale(32), backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:    { fontSize: clampFont(20, 17, 24), fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: clampFont(14, 12, 16), color: '#1d4ed8', fontWeight: '600', textAlign: 'center' },
  date:     { fontSize: clampFont(12, 10, 13), color: '#94a3b8', textAlign: 'center' },
  list:     { maxHeight: 320 },
  item:     { borderRadius: 12, padding: 12, marginBottom: 8, gap: 6 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:{ color: '#fff', fontSize: 10, fontWeight: '700' },
  itemText: { fontSize: clampFont(13, 11, 15), color: '#334155', lineHeight: 20 },
  btn:      { backgroundColor: '#1d4ed8', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  btnText:  { color: '#fff', fontSize: clampFont(16, 14, 18), fontWeight: '700' },
});
