import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceRecord } from '@/constants/types';

const KEY = 'attendance_achievements_v1';

export interface Achievement {
  id: string;
  label: string;
  desc: string;
  icon: string;
  earnedAt?: number;
}

const ALL: Achievement[] = [
  { id: 'streak7',  label: '7 أيام متواصلة',   desc: 'لم تفوّت يوماً لمدة أسبوع',      icon: '🔥' },
  { id: 'streak30', label: '30 يوماً متواصلاً', desc: 'شهر كامل من الانتظام',            icon: '💎' },
  { id: 'noLate7',  label: 'أسبوع بلا تأخر',    desc: '7 أيام دخول في الوقت',           icon: '⚡' },
  { id: 'full10',   label: '10 أيام مكتملة',    desc: '10 أيام بسجلات كاملة',           icon: '🏆' },
  { id: 'synced50', label: '50 سجلاً مزامناً',  desc: '50 سجل مع مزامنة الإنترنت',     icon: '🌐' },
];

export async function getEarned(): Promise<Achievement[]> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) return [];
    const ids: string[] = JSON.parse(v);
    return ALL.filter(a => ids.includes(a.id));
  } catch { return []; }
}

export async function checkAndAward(
  streak: number,
  allRecords: AttendanceRecord[],
  completeDays: number,
): Promise<Achievement[]> {
  const newlyEarned: Achievement[] = [];
  try {
    const v = await AsyncStorage.getItem(KEY);
    const earned: Record<string, number> = v ? JSON.parse(v) : {};
    const syncedCount = allRecords.filter(r => r.isSynced).length;

    const checks: [string, boolean][] = [
      ['streak7',  streak >= 7],
      ['streak30', streak >= 30],
      ['full10',   completeDays >= 10],
      ['synced50', syncedCount >= 50],
    ];

    let changed = false;
    for (const [id, cond] of checks) {
      if (cond && !earned[id]) {
        earned[id] = Date.now();
        const ach = ALL.find(a => a.id === id);
        if (ach) newlyEarned.push({ ...ach, earnedAt: earned[id] });
        changed = true;
      }
    }
    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify(earned));
  } catch {}
  return newlyEarned;
}

export { ALL as ALL_ACHIEVEMENTS };
