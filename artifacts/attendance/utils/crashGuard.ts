/**
 * crashGuard.ts
 * ──────────────
 * Crash-recovery system for the app.
 *
 * How it works:
 *   1. On every startup, writes a 'startup_started' marker.
 *   2. After 10 seconds of stable running, writes the SAME marker to 'startup_completed'.
 *   3. On next startup: if 'started' exists but 'completed' != 'started' →
 *      the app crashed last time. Increments the crash counter.
 *   4. After 3 crashes of the same version → warn the user.
 *
 * Fix (v3.1.3): onAppStable() now writes KEY_COMPLETED = KEY_STARTED (same value),
 * not a new timestamp — so they match on the next launch and no false crash is detected.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const KEY_STARTED      = 'cg_v1_started';
const KEY_COMPLETED    = 'cg_v1_completed';
const KEY_CRASH_COUNT  = 'cg_v1_crash_count';
const KEY_CRASH_FOR    = 'cg_v1_crash_for';
const KEY_BAD_IDS      = 'cg_v1_bad_ids';
const KEY_STABLE_MAP   = 'cg_v1_stable_map';

const CRASH_THRESHOLD  = 3;

function getAppVersion(): string {
  try { return Constants.expoConfig?.version ?? 'unknown'; } catch { return 'unknown'; }
}

async function getBadIds(): Promise<string[]> {
  try { const s = await AsyncStorage.getItem(KEY_BAD_IDS); return s ? JSON.parse(s) : []; } catch { return []; }
}

async function setBadIds(ids: string[]): Promise<void> {
  try { await AsyncStorage.setItem(KEY_BAD_IDS, JSON.stringify(ids)); } catch {}
}

export interface StartupResult {
  wasCrash:       boolean;
  crashCount:     number;
  shouldWarnUser: boolean;
  updateId:       string;
}

export async function onAppStarting(): Promise<StartupResult> {
  if (Platform.OS === 'web') {
    return { wasCrash: false, crashCount: 0, shouldWarnUser: false, updateId: 'web' };
  }

  const updateId = getAppVersion();
  const now      = String(Date.now());
  let wasCrash   = false;
  let crashCount = 0;

  try {
    const started   = await AsyncStorage.getItem(KEY_STARTED);
    const completed = await AsyncStorage.getItem(KEY_COMPLETED);

    if (started && started !== completed) {
      wasCrash = true;
      const crashFor  = await AsyncStorage.getItem(KEY_CRASH_FOR);
      const prevCount = parseInt((await AsyncStorage.getItem(KEY_CRASH_COUNT)) ?? '0');
      crashCount = (crashFor === updateId) ? prevCount + 1 : 1;

      await AsyncStorage.multiSet([
        [KEY_CRASH_COUNT, String(crashCount)],
        [KEY_CRASH_FOR,   updateId],
      ]);

      if (crashCount >= CRASH_THRESHOLD) {
        const bad = await getBadIds();
        if (!bad.includes(updateId)) { bad.push(updateId); await setBadIds(bad); }
      }
    }
    // Write new session marker AFTER checking old one
    await AsyncStorage.setItem(KEY_STARTED, now);
  } catch {}

  const shouldWarnUser = wasCrash && crashCount >= CRASH_THRESHOLD;
  return { wasCrash, crashCount, shouldWarnUser, updateId };
}

export async function onAppStable(): Promise<void> {
  if (Platform.OS === 'web') return;
  const updateId = getAppVersion();
  try {
    // IMPORTANT: write KEY_COMPLETED = the SAME value as KEY_STARTED (not a new timestamp).
    // This ensures started === completed on the next launch → no false crash detected.
    const started = await AsyncStorage.getItem(KEY_STARTED);
    await AsyncStorage.multiSet([
      [KEY_COMPLETED,   started ?? String(Date.now())],
      [KEY_CRASH_COUNT, '0'],
      [KEY_CRASH_FOR,   updateId],
    ]);
    const mapStr = await AsyncStorage.getItem(KEY_STABLE_MAP);
    const map: Record<string, { markedAt: number; version: string }> = mapStr ? JSON.parse(mapStr) : {};
    map[updateId] = { markedAt: Date.now(), version: updateId };
    const entries = Object.entries(map).sort((a, b) => b[1].markedAt - a[1].markedAt).slice(0, 10);
    await AsyncStorage.setItem(KEY_STABLE_MAP, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

export async function clearCurrentUpdateBadFlag(): Promise<void> {
  const updateId = getAppVersion();
  const bad      = await getBadIds();
  await setBadIds(bad.filter(id => id !== updateId));
  await AsyncStorage.setItem(KEY_CRASH_COUNT, '0');
  // Also reset completed to match started so next launch is clean
  try {
    const started = await AsyncStorage.getItem(KEY_STARTED);
    if (started) await AsyncStorage.setItem(KEY_COMPLETED, started);
  } catch {}
}
