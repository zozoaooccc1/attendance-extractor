import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { setPIN } from '@/utils/pinAuth';
import { useSettings } from '@/context/SettingsContext';
import { moderateScale, clampFont, buildFontSize, spacing } from '@/utils/responsive';

type Mode = 'enter' | 'confirm' | 'done';

export default function PinSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fontMultiplier } = useSettings();
  const styles = useMemo(() => createStyles(fontMultiplier), [fontMultiplier]);
  const [mode, setMode] = useState<Mode>('enter');
  const [first, setFirst] = useState('');
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState('');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const title  = mode === 'enter'   ? 'أدخل رمز PIN الجديد'  : 'أكّد رمز PIN';
  const hint   = mode === 'enter'   ? 'أدخل 4 أرقام' : 'أعد إدخال نفس الرمز';

  const handleDigit = async (d: string) => {
    if (d === '⌫') { setDigits(prev => prev.slice(0,-1)); setError(''); return; }
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length < 4) return;
    const pin = next.join('');
    if (mode === 'enter') {
      setFirst(pin);
      setDigits([]);
      setMode('confirm');
    } else {
      if (pin === first) {
        try {
          await setPIN(pin);
          setMode('done');
        } catch (err) {
          setError('فشل حفظ الرمز — حاول مجدداً');
          setDigits([]);
          setFirst('');
          setMode('enter');
        }
      } else {
        setError('الرمزان غير متطابقان — حاول مجدداً');
        setDigits([]);
        setFirst('');
        setMode('enter');
      }
    }
  };

  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','✓']];

  if (mode === 'done') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.doneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.doneIcon}>🔐</Text>
          <Text style={[styles.doneTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            تم تعيين رمز PIN
          </Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
            سيُطلب منك الرمز عند فتح التطبيق
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Ionicons name="checkmark-circle" size={moderateScale(20)} color={colors.primaryForeground} />
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
              تم
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={moderateScale(24)} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          إعداد رمز PIN
        </Text>
        <View style={{ width: moderateScale(40) }} />
      </View>

      <View style={styles.body}>
        <Ionicons name="keypad-outline" size={moderateScale(48)} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{title}</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>

        <View style={styles.dotsRow}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[styles.dot, {
              borderColor: colors.border,
              backgroundColor: digits[i] ? colors.primary : 'transparent',
            }]} />
          ))}
        </View>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: '#ef444420', borderColor: '#ef444440' }]}>
            <Ionicons name="alert-circle-outline" size={moderateScale(16)} color="#ef4444" />
            <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
          </View>
        )}

        <View style={styles.keypad}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.kRow}>
              {row.map(k => (
                <TouchableOpacity
                  key={k}
                  style={[styles.kBtn, {
                    backgroundColor: k === '⌫' ? colors.muted : k === '✓' ? 'transparent' : colors.card,
                    borderColor: colors.border,
                  }]}
                  onPress={() => handleDigit(k)}
                  activeOpacity={0.7}
                >
                  {k === '⌫' ? (
                    <Ionicons name="backspace-outline" size={moderateScale(22)} color={colors.foreground} />
                  ) : k === '✓' ? (
                    digits.length === 4 ? (
                      <Ionicons name="checkmark" size={moderateScale(22)} color={colors.success} />
                    ) : (
                      <View />
                    )
                  ) : (
                    <Text style={[styles.kText, { color: colors.foreground }]}>{k}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {mode === 'confirm' && (
          <TouchableOpacity onPress={() => { setMode('enter'); setDigits([]); setError(''); }}>
            <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← العودة لإدخال رمز جديد</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function createStyles(mul: number) {
  const fs = buildFontSize(mul);
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: moderateScale(12) },
    backBtn: { width: moderateScale(40), height: moderateScale(40), alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: clampFont(18, 15, 22) * mul },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: moderateScale(16), paddingHorizontal: spacing.lg },
    title: { fontSize: clampFont(20, 17, 24) * mul, textAlign: 'center' },
    hint: { fontSize: fs.base, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    dotsRow: { flexDirection: 'row', gap: moderateScale(16), marginVertical: moderateScale(8) },
    dot: { width: moderateScale(18), height: moderateScale(18), borderRadius: moderateScale(9), borderWidth: 2 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: moderateScale(10), borderWidth: 1, paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(10) },
    errorText: { fontSize: fs.sm, fontFamily: 'Inter_500Medium' },
    keypad: { gap: moderateScale(10), marginTop: moderateScale(8) },
    kRow: { flexDirection: 'row', gap: moderateScale(10) },
    kBtn: { width: moderateScale(80), height: moderateScale(60), borderRadius: moderateScale(16), alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    kText: { fontSize: clampFont(26, 22, 30) * mul, fontFamily: 'Inter_600SemiBold' },
    backLink: { fontSize: fs.sm, fontFamily: 'Inter_400Regular', marginTop: moderateScale(8) },
    doneCard: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: spacing.xl, borderRadius: moderateScale(24), borderWidth: 1, gap: moderateScale(14), padding: moderateScale(30) },
    doneIcon: { fontSize: moderateScale(56) },
    doneTitle: { fontSize: clampFont(22, 18, 26) * mul, textAlign: 'center' },
    doneSub: { fontSize: fs.base, textAlign: 'center', fontFamily: 'Inter_400Regular' },
    doneBtn: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(10), paddingVertical: moderateScale(14), paddingHorizontal: moderateScale(28), borderRadius: moderateScale(14), marginTop: moderateScale(8) },
    doneBtnText: { fontSize: fs.lg },
  });
}
