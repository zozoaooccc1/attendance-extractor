import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Linking, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, clampFont } from '@/utils/responsive';
import { AppUpdateInfo, snoozeUpdate } from '@/utils/easUpdateChecker';
import { getVersionChangelog, type ChangelogItem } from '@/constants/changelog';

// ── Changelog item icon/color map ─────────────────────────────────────────────
const ITEM_META: Record<string, { icon: string; color: string; label: string }> = {
  new:     { icon: 'star-outline',        color: '#22c55e', label: 'جديد'    },
  fix:     { icon: 'build-outline',       color: '#f59e0b', label: 'إصلاح'   },
  improve: { icon: 'trending-up-outline', color: '#60a5fa', label: 'تحسين'   },
};

type Phase = 'idle' | 'downloading' | 'ready' | 'error';

interface Props {
  visible: boolean;
  info: AppUpdateInfo | null;
  onDismiss: () => void;
}

export function AppUpdateModal({ visible, info, onDismiss }: Props) {
  const [phase, setPhase]       = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  if (!info) return null;

  const changelog: ChangelogItem | null = getVersionChangelog(info.version);

  // ── تحميل + تثبيت APK مباشرة بدون قائمة مشاركة ─────────────────────────────
  const handleInstall = async () => {
    // Web: fallback to direct link
    if (Platform.OS === 'web') {
      try { await Linking.openURL(info.downloadUrl); } catch {}
      onDismiss();
      return;
    }

    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');

    try {
      const dest = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '') + 'attendance_update.apk';

      // احذف أي نسخة قديمة محفوظة
      try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}

      // تحميل مع تتبع التقدم — EAS URL يُعيد توجيهاً لـ S3 عام
      const task = FileSystem.createDownloadResumable(
        info.downloadUrl,
        dest,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setProgress(Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100));
          }
        },
      );

      const result = await task.downloadAsync();
      if (!result?.uri) throw new Error('no_uri');

      setPhase('ready');

      if (Platform.OS === 'android') {
        // تحويل file:// إلى content:// لـ Android ثم فتح نافذة التثبيت مباشرة
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'application/vnd.android.package-archive',
        });
        // عُد للوضع الطبيعي — لا تغلق النافذة تلقائياً
        // يمكن للمستخدم إعادة التثبيت أو إغلاق النافذة يدوياً
        setPhase('idle');
      } else {
        // iOS: افتح الرابط في المتصفح
        await Linking.openURL(info.downloadUrl);
        setPhase('idle');
      }
    } catch {
      setPhase('error');
      setErrorMsg('تعذّر تحميل التحديث — تحقق من اتصالك وأعد المحاولة');
    }
  };

  const handleLater = async () => {
    await snoozeUpdate(info.version);
    setPhase('idle');
    setProgress(0);
    onDismiss();
  };

  const isActive = phase === 'downloading' || phase === 'ready';

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* ── Icon ── */}
          <View style={s.iconRow}>
            <View style={s.iconWrap}>
              <Ionicons name="rocket-outline" size={moderateScale(34)} color="#60a5fa" />
            </View>
          </View>

          {/* ── Header ── */}
          <Text style={s.title}>🎉 تحديث جديد متاح!</Text>
          <Text style={s.version}>الإصدار {info.version}</Text>

          {/* ── Changelog ── */}
          <ScrollView style={s.changelogBox} showsVerticalScrollIndicator={false}>
            {changelog ? (
              <>
                <Text style={s.changelogTitle}>{changelog.title}</Text>
                {changelog.items.map((item, i) => {
                  const meta = ITEM_META[item.type] ?? ITEM_META.improve;
                  return (
                    <View key={i} style={s.changelogRow}>
                      <View style={[s.changelogBadge, { backgroundColor: meta.color + '20' }]}>
                        <Ionicons name={meta.icon as any} size={moderateScale(13)} color={meta.color} />
                      </View>
                      <Text style={s.changelogText}>{item.text}</Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={s.changelogText}>{info.notes}</Text>
            )}
          </ScrollView>

          {/* ── Data safety badge ── */}
          <View style={s.safeRow}>
            <Ionicons name="shield-checkmark-outline" size={moderateScale(14)} color="#4ade80" />
            <Text style={s.safeText}>بياناتك محفوظة — التحديث لا يمسّها</Text>
          </View>

          {/* ── Download progress ── */}
          {phase === 'downloading' && (
            <View style={s.progressWrap}>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${progress}%` as any }]} />
              </View>
              <Text style={s.progressText}>جارٍ تحميل التحديث... {progress}%</Text>
            </View>
          )}

          {/* ── Ready to install indicator ── */}
          {phase === 'ready' && (
            <View style={s.progressWrap}>
              <ActivityIndicator color="#60a5fa" size="small" />
              <Text style={s.progressText}>جارٍ فتح نافذة التثبيت...</Text>
            </View>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={moderateScale(16)} color="#f87171" />
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* ── Install / Retry button ── */}
          {!isActive && (
            <TouchableOpacity
              style={[s.btnPrimary, phase === 'error' && { backgroundColor: '#dc2626' }]}
              onPress={handleInstall}
              activeOpacity={0.85}
            >
              <Ionicons
                name={phase === 'error' ? 'refresh-outline' : 'download-outline'}
                size={moderateScale(19)}
                color="#fff"
              />
              <Text style={s.btnPrimaryText}>
                {phase === 'error' ? 'إعادة المحاولة' : '📥 تثبيت التحديث'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Snooze / Cancel ── */}
          {!isActive && (
            <TouchableOpacity style={s.btnSecondary} onPress={handleLater} activeOpacity={0.7}>
              <Text style={s.btnSecondaryText}>
                {phase === 'error' ? 'إلغاء' : 'لاحقاً'}
              </Text>
            </TouchableOpacity>
          )}

          {isActive && (
            <Text style={s.waitHint}>يُرجى الانتظار حتى اكتمال التحميل...</Text>
          )}

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000BB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(20),
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: moderateScale(22),
    padding: moderateScale(24),
    width: '100%',
    gap: moderateScale(12),
    borderWidth: 1,
    borderColor: '#3b82f640',
    maxHeight: '88%',
  },

  iconRow:  { alignItems: 'center' },
  iconWrap: {
    width: moderateScale(68), height: moderateScale(68),
    borderRadius: moderateScale(34), backgroundColor: '#3b82f615',
    alignItems: 'center', justifyContent: 'center',
  },

  title: {
    color: '#f1f5f9', fontSize: clampFont(19, 16, 23),
    fontWeight: '700', textAlign: 'center',
  },
  version: {
    color: '#60a5fa', fontSize: clampFont(13, 12, 15),
    textAlign: 'center', fontWeight: '600',
  },

  changelogBox: {
    maxHeight: moderateScale(180),
    backgroundColor: '#0f172a',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
  },
  changelogTitle: {
    color: '#94a3b8', fontSize: clampFont(11, 10, 13),
    fontWeight: '700', marginBottom: moderateScale(8),
    letterSpacing: 0.4,
  },
  changelogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: moderateScale(8),
    marginBottom: moderateScale(7),
  },
  changelogBadge: {
    width: moderateScale(22), height: moderateScale(22),
    borderRadius: moderateScale(6),
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  changelogText: {
    color: '#cbd5e1', fontSize: clampFont(12, 11, 14),
    lineHeight: moderateScale(20), flex: 1,
  },

  safeRow: {
    flexDirection: 'row', alignItems: 'center', gap: moderateScale(7),
    backgroundColor: '#16a34a15', borderRadius: moderateScale(10),
    paddingVertical: moderateScale(9), paddingHorizontal: moderateScale(11),
  },
  safeText: {
    color: '#86efac', fontSize: clampFont(11, 10, 13), flex: 1,
  },

  progressWrap: {
    gap: moderateScale(7), alignItems: 'center',
  },
  progressBarBg: {
    width: '100%', height: moderateScale(7),
    backgroundColor: '#1e3a5f',
    borderRadius: moderateScale(4), overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: moderateScale(4),
  },
  progressText: {
    color: '#94a3b8', fontSize: clampFont(12, 11, 14),
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: moderateScale(8),
    backgroundColor: '#7f1d1d30', borderRadius: moderateScale(10),
    padding: moderateScale(10),
  },
  errorText: {
    color: '#fca5a5', fontSize: clampFont(12, 11, 14), flex: 1,
  },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: moderateScale(8), backgroundColor: '#1d4ed8',
    borderRadius: moderateScale(14), paddingVertical: moderateScale(15),
  },
  btnPrimaryText: {
    color: '#fff', fontSize: clampFont(15, 13, 18), fontWeight: '700',
  },
  btnSecondary: {
    alignItems: 'center', paddingVertical: moderateScale(8),
  },
  btnSecondaryText: {
    color: '#64748b', fontSize: clampFont(13, 12, 15),
  },
  waitHint: {
    color: '#475569', fontSize: clampFont(11, 10, 13),
    textAlign: 'center',
  },
});
