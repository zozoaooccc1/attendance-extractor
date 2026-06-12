import * as FileSystem from 'expo-file-system';
import LZString from 'lz-string';
import { getAllDates, getRecordsByDate, insertRecord } from './database';

export const BACKUP_FILENAME  = 'attendance_backup_v2.lzb';   // compressed
export const BACKUP_KEY_DATE  = 'attendance_backup_last_date'; // AsyncStorage key
export const INTERNAL_BACKUP_PATH = `${FileSystem.documentDirectory}${BACKUP_FILENAME}`;

export interface BackupData {
  version: string;
  exportedAt: string;
  records: any[];
}

// ── Collect all records from DB ──────────────────────────────────────────────
function collectAllRecords(): any[] {
  const dates = getAllDates();
  const records: any[] = [];
  for (const date of dates) records.push(...getRecordsByDate(date));
  return records;
}

// ── Compress JSON → Base64 string (lz-string) ────────────────────────────────
function compress(data: BackupData): string {
  return LZString.compressToBase64(JSON.stringify(data));
}

function decompress(raw: string): BackupData {
  const json = LZString.decompressFromBase64(raw);
  if (!json) throw new Error('Decompression failed');
  return JSON.parse(json);
}

// ── Daily auto-backup (call on every app open) ───────────────────────────────
// Returns true if backup was actually performed, false if already done today.
export async function runDailyBackupIfNeeded(storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}): Promise<boolean> {
  try {
    const records = collectAllRecords();
    if (records.length === 0) return false;              // nothing to back up

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastDate = await storage.getItem(BACKUP_KEY_DATE);
    if (lastDate === today) return false;                 // already backed up today

    const data: BackupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      records,
    };
    const compressed = compress(data);
    await FileSystem.writeAsStringAsync(INTERNAL_BACKUP_PATH, compressed, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await storage.setItem(BACKUP_KEY_DATE, today);
    return true;
  } catch {
    return false;
  }
}

// ── Get info about the internal backup ───────────────────────────────────────
export async function getInternalBackupInfo(): Promise<{
  exists: boolean; date: string | null; count: number; sizeKB: number;
}> {
  try {
    const info = await FileSystem.getInfoAsync(INTERNAL_BACKUP_PATH);
    if (!info.exists) return { exists: false, date: null, count: 0, sizeKB: 0 };
    const raw = await FileSystem.readAsStringAsync(INTERNAL_BACKUP_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const sizeKB = Math.round((raw.length * 0.75) / 1024); // approx uncompressed KB
    const data = decompress(raw);
    return { exists: true, date: data.exportedAt, count: data.records?.length ?? 0, sizeKB };
  } catch {
    return { exists: false, date: null, count: 0, sizeKB: 0 };
  }
}

// ── Export compressed backup to user-chosen folder (Downloads) via SAF ───────
export async function exportBackupToDownloads(): Promise<'ok' | 'cancelled' | 'error'> {
  try {
    const records = collectAllRecords();
    if (records.length === 0) return 'error';

    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return 'cancelled';

    const data: BackupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      records,
    };
    const compressed = compress(data);

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      perm.directoryUri, BACKUP_FILENAME, 'application/octet-stream'
    );
    await FileSystem.writeAsStringAsync(fileUri, compressed, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return 'ok';
  } catch {
    return 'error';
  }
}

// ── Import compressed backup from user-chosen folder via SAF ─────────────────
export async function importBackupFromDownloads(): Promise<BackupData | null> {
  try {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return null;

    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(perm.directoryUri);
    const found = files.find(f => f.includes('attendance_backup'));
    if (!found) return null;

    const raw = await FileSystem.readAsStringAsync(found, { encoding: FileSystem.EncodingType.UTF8 });

    // Support both compressed (v2) and plain JSON (v1 fallback)
    try { return decompress(raw); } catch {}
    return JSON.parse(raw) as BackupData;
  } catch {
    return null;
  }
}

// ── Restore records from backup data ─────────────────────────────────────────
export async function restoreFromBackupData(
  data: BackupData
): Promise<{ restored: number; skipped: number }> {
  let restored = 0, skipped = 0;
  for (const record of data.records ?? []) {
    try { insertRecord(record); restored++; } catch { skipped++; }
  }
  return { restored, skipped };
}

// Legacy alias used by RestoreModal / _layout.tsx
export { importBackupFromDownloads as importBackupFromSAF };
