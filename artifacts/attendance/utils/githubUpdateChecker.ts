/**
 * githubUpdateChecker.ts
 * ─────────────────────
 * يفحص Repo عام للتحقق من وجود إصدار APK أحدث.
 * لا يحتاج أي مصادقة — يستخدم raw GitHub content.
 */
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// version.json في الـ repo العام
const VERSION_URL =
  'https://raw.githubusercontent.com/zozoaooccc1/attendance-releases/main/version.json';

const SNOOZE_KEY = 'apk_update_snoozed_v';

export interface AppUpdateInfo {
  version: string;
  notes: string;
  downloadUrl: string;
}

function parseVer(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
}

function isNewer(remote: string, current: string): boolean {
  const r = parseVer(remote);
  const c = parseVer(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const ri = r[i] ?? 0;
    const ci = c[i] ?? 0;
    if (ri > ci) return true;
    if (ri < ci) return false;
  }
  return false;
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

    const res = await Promise.race<Response | 'timeout'>([
      fetch(VERSION_URL, { cache: 'no-store' }),
      new Promise<'timeout'>(r => setTimeout(() => r('timeout'), 8000)),
    ]);

    if (res === 'timeout' || !res.ok) return null;

    const data = await res.json() as {
      version: string;
      notes: string;
      download_url: string;
    };

    if (!data.version || !isNewer(data.version, currentVersion)) return null;

    // هل المستخدم أجّل هذا الإصدار؟
    const snoozed = await AsyncStorage.getItem(SNOOZE_KEY + data.version);
    if (snoozed) return null;

    return {
      version: data.version,
      notes: data.notes ?? '',
      downloadUrl: data.download_url ?? 'https://github.com/zozoaooccc1/attendance-releases',
    };
  } catch {
    return null;
  }
}

export async function snoozeUpdate(version: string): Promise<void> {
  try { await AsyncStorage.setItem(SNOOZE_KEY + version, '1'); } catch {}
}
