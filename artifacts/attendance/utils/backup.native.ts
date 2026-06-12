import * as FileSystem from 'expo-file-system';
import LZString from 'lz-string';
import { getAllDates, getRecordsByDate, insertRecord } from './database';
import { IMAGES_DIR, readImageAsBase64, writeImageFromBase64 } from './imageStorage';

export const BACKUP_FILENAME      = 'attendance_backup_v2.lzb';
export const BACKUP_FULL_FILENAME = 'attendance_backup_full_v1.lzb';
export const BACKUP_KEY_DATE      = 'attendance_backup_last_date';
export const INTERNAL_BACKUP_PATH = `${FileSystem.documentDirectory}${BACKUP_FILENAME}`;

export interface BackupData {
  version: string;
  exportedAt: string;
  records: any[];
  images?: Record<string, string>; // recordId → base64 (only in full backup)
}

function collectAllRecords(): any[] {
  const dates = getAllDates();
  const records: any[] = [];
  for (const date of dates) records.push(...getRecordsByDate(date));
  return records;
}

function compress(data: BackupData): string {
  return LZString.compressToBase64(JSON.stringify(data));
}

function decompress(raw: string): BackupData {
  const json = LZString.decompressFromBase64(raw);
  if (!json) throw new Error('Decompression failed');
  return JSON.parse(json);
}

// ── النسخة الاحتياطية اليومية التلقائية (بيانات فقط) ────────────────────────
export async function runDailyBackupIfNeeded(storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}): Promise<boolean> {
  try {
    const records = collectAllRecords();
    if (records.length === 0) return false;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = await storage.getItem(BACKUP_KEY_DATE);
    if (lastDate === today) return false;

    const data: BackupData = { version: '2.0', exportedAt: new Date().toISOString(), records };
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

// ── معلومات النسخة الداخلية ───────────────────────────────────────────────────
export async function getInternalBackupInfo(): Promise<{
  exists: boolean; date: string | null; count: number; sizeKB: number;
}> {
  try {
    const info = await FileSystem.getInfoAsync(INTERNAL_BACKUP_PATH);
    if (!info.exists) return { exists: false, date: null, count: 0, sizeKB: 0 };
    const raw = await FileSystem.readAsStringAsync(INTERNAL_BACKUP_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const sizeKB = Math.round((raw.length * 0.75) / 1024);
    const data = decompress(raw);
    return { exists: true, date: data.exportedAt, count: data.records?.length ?? 0, sizeKB };
  } catch {
    return { exists: false, date: null, count: 0, sizeKB: 0 };
  }
}

// ── تصدير نسخة بيانات فقط (بدون صور) ────────────────────────────────────────
export async function exportBackupToDownloads(): Promise<'ok' | 'cancelled' | 'error'> {
  try {
    const records = collectAllRecords();
    if (records.length === 0) return 'error';

    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return 'cancelled';

    const data: BackupData = { version: '2.0', exportedAt: new Date().toISOString(), records };
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

// ── تصدير نسخة شاملة (بيانات + صور) ─────────────────────────────────────────
export async function exportFullBackupToDownloads(
  onProgress?: (done: number, total: number) => void
): Promise<'ok' | 'cancelled' | 'error'> {
  try {
    const records = collectAllRecords();
    if (records.length === 0) return 'error';

    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return 'cancelled';

    // جمع الصور كـ base64
    const images: Record<string, string> = {};
    const recordsWithImages = records.filter(r => r.imagePath);
    const total = recordsWithImages.length;

    for (let i = 0; i < recordsWithImages.length; i++) {
      const record = recordsWithImages[i];
      try {
        const b64 = await readImageAsBase64(record.imagePath);
        if (b64) images[record.id] = b64;
      } catch {}
      onProgress?.(i + 1, total);
    }

    const data: BackupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      records,
      images,
    };
    const compressed = compress(data);

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      perm.directoryUri, BACKUP_FULL_FILENAME, 'application/octet-stream'
    );
    await FileSystem.writeAsStringAsync(fileUri, compressed, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return 'ok';
  } catch {
    return 'error';
  }
}

// ── استيراد نسخة من مجلد ─────────────────────────────────────────────────────
export async function importBackupFromDownloads(): Promise<BackupData | null> {
  try {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return null;

    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(perm.directoryUri);
    const found = files.find(f => f.includes('attendance_backup'));
    if (!found) return null;

    const raw = await FileSystem.readAsStringAsync(found, { encoding: FileSystem.EncodingType.UTF8 });
    try { return decompress(raw); } catch {}
    return JSON.parse(raw) as BackupData;
  } catch {
    return null;
  }
}

// ── استعادة السجلات (+ الصور إن وُجدت) ──────────────────────────────────────
export async function restoreFromBackupData(
  data: BackupData
): Promise<{ restored: number; skipped: number; imagesRestored: number }> {
  let restored = 0, skipped = 0, imagesRestored = 0;

  for (const record of data.records ?? []) {
    try { insertRecord(record); restored++; } catch { skipped++; }
  }

  // استعادة الصور إن كانت موجودة في النسخة الشاملة
  if (data.images) {
    for (const [recordId, base64] of Object.entries(data.images)) {
      try {
        await writeImageFromBase64(recordId, base64);
        imagesRestored++;
      } catch {}
    }
  }

  return { restored, skipped, imagesRestored };
}

// Legacy alias
export { importBackupFromDownloads as importBackupFromSAF };
