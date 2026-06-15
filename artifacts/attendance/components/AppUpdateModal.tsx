import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Linking, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, clampFont } from '@/utils/responsive';
import { AppUpdateInfo, snoozeUpdate } from '@/utils/easUpdateChecker';
import { getVersionChangelog, type ChangelogItem } from '@/constants/changelog';

const ITEM_META: Record<string, { icon: string; color: string; label: string }> = {
  new:     { icon: 'star-outline',        color: '#22c55e', label: 'جديد'    },
  fix:     { icon: 'build-outline',       color: '#f59e0b', label: 'إصلاح'   },
  improve: { icon: 'trending-up-outline', color: '#60a5fa', label: 'تحسين'   },
};

// 'launched' = المثبّت فُتح بنجاح لكن المودال يبقى حتى يغلقه المستخدم يدوياً
type Phase = 'idle' | 'downloading' | 'installing' | 'launched' | 'error';

interface Props {
  visible: boolean;
  info: AppUpdateInfo | null;
  onDismiss: () => void;
}

export function AppUpdateModal({ visible, info, onDismiss }: Props) {
  const [phase, setPhase]             = useState<Phase>('idle');
  const [progress, setProgress]       = useState(0);
  const [errorMsg, setErrorMsg]       = useState('');
  const [localApkUri, setLocalApkUri] = useState<string | null>(null);

  // إعادة تعيين الحالة عند إغلاق المودال أو تغيير الإصدار
  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setProgress(0);
      setErrorMsg('');
      setLocalApkUri(null);
    }
  }, [visible]);

  if (!info) return null;

  const changelog: ChangelogItem | null = getVersionChangelog(info.version);

  // ── فتح نافذة التثبيت ────────────────────────────────────────────────────────
  const launchInstaller = async (fileUri: string) => {
    setPhase('installing');
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/vnd.android.package-archive',
        });
        // ✅ لا نغلق المودال تلقائياً — startActivityAsync تعود فور انبثاق المثبّت
        // المودال يبقى مفتوحاً حتى يغلقه المستخدم بنفسه
        setPhase('launched');
      } else {
        await Linking.openURL(info.downloadUrl);
        setPhase('launched');
      }
    } catch {
      // المحاولة البديلة: مشاركة الملف
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.android.package-archive',
            dialogTitle: 'تثبيت تحديث التطبيق',
          });
          setPhase('launched');
        } else {
          throw new Error('sharing_unavailable');
        }
      } catch {
        setPhase('error');
        setErrorMsg('تعذّر فتح نافذة التثبيت — اضغط "تثبيت" مجدداً');
      }
    }
  };

  // ── تحميل APK ثم تشغيل المثبّت ──────────────────────────────────────────────
  const handleInstall = async () => {
    if (Platform.OS === 'web') {
      try { await Linking.openURL(info.downloadUrl); } catch {}
      onDismiss();
      return;
    }

    // إذا كان الملف محمّلاً → فتح المثبّت مباشرة
    if (localApkUri) {
      await launchInstaller(localApkUri);
      return;
    }

    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');

    try {
      const dest = (FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '') + 'attendance_update.apk';
      try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}

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

      setLocalApkUri(result.uri);
      await launchInstaller(result.uri);

    } catch {
      setPhase('error');
      setErrorMsg('تعذّر تحميل التحديث — تحقق من اتصالك وأعد المحاولة');
    }
  };

  const handleLater = async () => {
    await snoozeUpdate(info.version);
    setPhase('idle');
    setProgress(0);
    setLocalApkUri(null);
    onDismiss();
  };

  const isDownloading = phase === 'downloading';
  const isInstalling  = phase === 'installing';
  const isLaunched    = phase === 'launched';
  const isBusy        = isDownloading || isInstalling;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>

          <View style={s.iconRow}>
            <View style={[s.iconWrap, isLaunched && s.iconWrapGreen]}>
              <Ionicons
                name={isLaunched ? 'checkmark-circle-outline' : 'rocket-outline'}
                size={moderateScale(34)}
                color={isLaunched ? '#4ade80' : '#60a5fa'}
              />
            </View>
          </View>

          {isLaunched ? (
            <>
              <Text style={s.title}>✅ جاهز للتثبيت!</Text>
              <Text style={s.launchedSub}>
                انتقل لنافذة المثبّت التي فُتحت للتو واضغط «تثبيت».{'\n'}
                إذا أغلقتها عن طريق الخطأ اضغط «فتح مجدداً».
              </Text>
            </>
          ) : (
            <>
              <Text style={s.title}>🎉 تحديث جديد متاح!</Text>
              <Text style={s.version}>الإصدار {info.version}</Text>
            </>
          )}

          {!isLaunched && (
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
          )}

          {!isLaunched && (
            <View style={s.safeRow}>
              <Ionicons name="shield-checkmark-outline" size={moderateScale(14)} color="#4ade80" />
              <Text style={s.safeText}>بياناتك محفوظة — التحديث لا يمسّها</Text>
            </View>
          )}

          {/* شريط التحميل */}
          {isDownloading && (
            <View style={s.progressWrap}>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${progress}%` as any }]} />
              </View>
              <Text style={s.progressText}>جارٍ تحميل التحديث... {progress}%</Text>
            </View>
          )}

          {/* حالة فتح المثبّت */}
          {isInstalling && (
            <View style={s.progressWrap}>
              <ActivityIndicator color="#60a5fa" size="small" />
              <Text style={s.progressText}>جارٍ فتح نافذة التثبيت...</Text>
            </View>
          )}

          {/* رسالة الخطأ */}
          {phase === 'error' && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={moderateScale(16)} color="#f87171" />
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* أزرار حالة launched */}
          {isLaunched && (
            <>
              <TouchableOpacity
                style={s.btnReopen}
                onPress={() => localApkUri && launchInstaller(localApkUri)}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={moderateScale(19)} color="#fff" />
                <Text style={s.btnPrimaryText}>فتح نافذة التثبيت مجدداً</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSecondary} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={s.btnSecondaryText}>إغلاق</Text>
              </TouchableOpacity>
            </>
          )}

          {/* أزرار الحالات الأخرى */}
          {!isBusy && !isLaunched && (
            <>
              <TouchableOpacity
                style={[s.btnPrimary, phase === 'error' && !localApkUri && { backgroundColor: '#dc2626' }]}
                onPress={handleInstall}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={phase === 'error' && !localApkUri ? 'refresh-outline' : 'download-outline'}
                  size={moderateScale(19)}
                  color="#fff"
                />
                <Text style={s.btnPrimaryText}>
                  {localApkUri && phase === 'error'
                    ? '🔄 فتح نافذة التثبيت'
                    : phase === 'error'
                    ? '↩ إعادة التحميل'
                    : '📥 تثبيت التحديث'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSecondary} onPress={handleLater} activeOpacity={0.7}>
                <Text style={s.btnSecondaryText}>
                  {phase === 'error' ? 'إلغاء' : 'لاحقاً'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isBusy && (
            <Text style={s.waitHint}>يُرجى الانتظار...</Text>
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
  iconRow:      { alignItems: 'center' },
  iconWrap: {
    width: moderateScale(68), height: moderateScale(68),
    borderRadius: moderateScale(34), backgroundColor: '#3b82f615',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapGreen: { backgroundColor: '#4ade8015' },
  title: {
    color: '#f1f5f9', fontSize: clampFont(19, 16, 23),
    fontWeight: '700', textAlign: 'center',
  },
  version: {
    color: '#60a5fa', fontSize: clampFont(13, 12, 15),
    textAlign: 'center', fontWeight: '600',
  },
  launchedSub: {
    color: '#94a3b8', fontSize: clampFont(13, 12, 15),
    textAlign: 'center', lineHeight: moderateScale(22),
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
    flexDirection: 'row', alignItems: 'flex-start',
    gap: moderateScale(8), marginBottom: moderateScale(7),
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
    height: '100%', backgroundColor: '#3b82f6',
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
  btnReopen: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: moderateScale(8), backgroundColor: '#16a34a',
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
