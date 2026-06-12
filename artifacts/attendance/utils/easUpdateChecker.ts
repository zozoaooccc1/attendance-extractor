/**
 * easUpdateChecker.ts
 * ───────────────────
 * يفحص EAS مباشرةً للتحقق من وجود APK أحدث.
 * يستخدم Expo GraphQL API — يقرأ التوكن من app.config.js extra.
 *
 * لإعداد التوكن في بيئة البناء:
 *   eas secret:create --scope project --name EXPO_TOKEN --value <your-token>
 */
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EAS_API      = 'https://api.expo.dev/graphql';
const PROJECT_ID   = 'e0d07504-ef8f-4a60-9ce3-92694b0d6804';
const SNOOZE_KEY   = 'apk_update_snoozed_eas_v';

export interface AppUpdateInfo {
  version: string;
  notes: string;
  downloadUrl: string;
}

function parseVer(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
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

function formatArabicDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    const token: string  = (Constants.expoConfig?.extra?.expoToken as string) ?? '';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const query = `{
      app {
        byId(appId: "${PROJECT_ID}") {
          builds(limit: 1, offset: 0, platform: ANDROID, status: FINISHED) {
            id
            appVersion
            appBuildVersion
            createdAt
            artifacts {
              applicationArchiveUrl
            }
          }
        }
      }
    }`;

    const res = await Promise.race<Response | 'timeout'>([
      fetch(EAS_API, { method: 'POST', headers, body: JSON.stringify({ query }) }),
      new Promise<'timeout'>(r => setTimeout(() => r('timeout'), 10_000)),
    ]);

    if (res === 'timeout' || !res.ok) return null;

    const json = await res.json() as {
      data?: {
        app?: {
          byId?: {
            builds?: Array<{
              id: string;
              appVersion: string;
              appBuildVersion: string;
              createdAt: string;
              artifacts?: { applicationArchiveUrl?: string };
            }>;
          };
        };
      };
      errors?: unknown[];
    };

    if (json.errors || !json.data?.app?.byId?.builds?.length) return null;

    const build = json.data.app.byId.builds[0];
    const downloadUrl = build.artifacts?.applicationArchiveUrl ?? '';

    if (!build.appVersion || !downloadUrl) return null;
    if (!isNewer(build.appVersion, currentVersion)) return null;

    // هل المستخدم أجّل هذا الإصدار؟
    const snoozed = await AsyncStorage.getItem(SNOOZE_KEY + build.appVersion);
    if (snoozed) return null;

    const dateStr = build.createdAt ? formatArabicDate(build.createdAt) : '';
    const notes   = dateStr ? `صدر بتاريخ ${dateStr}` : 'إصدار جديد متاح';

    return {
      version:     build.appVersion,
      notes,
      downloadUrl,
    };
  } catch {
    return null;
  }
}

export async function snoozeUpdate(version: string): Promise<void> {
  try { await AsyncStorage.setItem(SNOOZE_KEY + version, '1'); } catch {}
}
