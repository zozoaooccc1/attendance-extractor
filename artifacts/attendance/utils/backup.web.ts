// Web stubs — backup functionality is only available on native platforms
// This file prevents import errors when the app runs on the web

export const BACKUP_FILENAME = 'attendance_backup_v2.lzb';
export const BACKUP_FULL_FILENAME = 'attendance_backup_full_v1.lzb';
export const BACKUP_KEY_DATE = 'attendance_backup_last_date';
export const INTERNAL_BACKUP_PATH = '';

export interface BackupData {
  version: string;
  exportedAt: string;
  records: any[];
  images?: Record<string, string>;
}

export async function runDailyBackupIfNeeded(): Promise<boolean> {
  return false;
}

export async function getInternalBackupInfo(): Promise<{
  exists: boolean; date: string | null; count: number; sizeKB: number;
}> {
  return { exists: false, date: null, count: 0, sizeKB: 0 };
}

export async function exportBackupToDownloads(): Promise<'ok' | 'cancelled' | 'error'> {
  return 'error';
}

export async function exportFullBackupToDownloads(): Promise<'ok' | 'cancelled' | 'error'> {
  return 'error';
}

export async function importBackupFromDownloads(): Promise<BackupData | null> {
  return null;
}

export async function restoreFromBackupData(): Promise<{ restored: number; skipped: number; imagesRestored: number }> {
  return { restored: 0, skipped: 0, imagesRestored: 0 };
}

export { importBackupFromDownloads as importBackupFromSAF };
