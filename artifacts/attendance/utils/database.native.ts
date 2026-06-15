import * as SQLite from 'expo-sqlite';
import { AttendanceRecord, ShiftType, RecordType } from '@/constants/types';

let db: SQLite.SQLiteDatabase | null = null;

// ─── TASK 3: Debug logger ────────────────────────────────────────────────────
const __DEV_DB__ = __DEV__;

function dbLog(level: 'info' | 'warn', caller: string, params: unknown[]): void {
  if (!__DEV_DB__) return;
  const types = params.map(p => (p === null ? 'null' : typeof p));
  if (level === 'warn') {
    console.warn(`[DB:safeRun][${caller}] ⚠️  Unsafe object intercepted and fixed — types: ${types.join(', ')}`);
  } else {
    console.log(`[DB:safeRun][${caller}] params(${params.length}): ${types.join(', ')}`);
  }
}

// ─── TASK 1: toSafe — converts ANY JS value to a Kotlin-safe primitive ───────
/**
 * Converts any JavaScript value to a primitive safe for expo-sqlite v15 JSI.
 * The Kotlin bridge accepts ONLY: string | number | null.
 * Objects, booleans, undefined, NaN, Infinity, Date, and Arrays are all
 * transformed here — never passed raw.
 */
function toSafe(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime();
  if (Array.isArray(v)) return v.length > 0 ? toSafe(v[0]) : null;
  try { return JSON.stringify(v); } catch { return null; }
}

// ─── TASK 1 + 3 + 4: safeRun — the mandatory call wrapper ───────────────────
/**
 * MANDATORY SAFETY LAYER.
 * Every write to SQLite MUST go through safeRun().
 *
 * - Forces all params through toSafe() (Task 1)
 * - Logs every call in dev mode (Task 3)
 * - Catches and auto-fixes any unsafe values, logs a warning (Task 4)
 */
function safeRun(
  database: SQLite.SQLiteDatabase,
  sql: string,
  params: unknown[],
  caller = 'unknown'
): void {
  const hasUnsafe = params.some(
    p => p !== null && p !== undefined && typeof p === 'object' && !(p instanceof Date)
  );
  if (hasUnsafe) {
    dbLog('warn', caller, params);
  } else if (__DEV_DB__) {
    dbLog('info', caller, params);
  }

  const safe = params.map(toSafe);

  try {
    database.runSync(sql, safe as SQLite.SQLiteBindParams);
  } catch (err) {
    console.error(`[DB:safeRun][${caller}] runSync error after sanitization:`, err);
    throw err;
  }
}

// ─── Database init ───────────────────────────────────────────────────────────

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    try {
      db = SQLite.openDatabaseSync('attendance.db');
    } catch (err) {
      console.error('[DB] openDatabaseSync failed:', err);
      // محاولة ثانية بعد مسح المرجع
      db = null;
      try {
        db = SQLite.openDatabaseSync('attendance.db');
      } catch (err2) {
        console.error('[DB] openDatabaseSync retry also failed:', err2);
        throw err2;
      }
    }
  }
  return db;
}

export function initDatabase(): void {
  try {
    const database = getDatabase();
    database.execSync(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        shiftType TEXT NOT NULL,
        imagePath TEXT NOT NULL,
        ocrTime TEXT,
        ocrConfidence REAL,
        confirmedTime TEXT NOT NULL,
        isManuallyEdited INTEGER NOT NULL DEFAULT 0,
        isSynced INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL,
        note TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
    `);
    try { database.execSync(`ALTER TABLE records ADD COLUMN isSynced INTEGER DEFAULT 1`); } catch {}
    try { database.execSync(`ALTER TABLE records ADD COLUMN note TEXT`); } catch {}
  } catch (err) {
    console.error('[DB] initDatabase failed:', err);
    // إعادة تعيين المرجع لإعادة المحاولة لاحقاً
    db = null;
    throw err;
  }
}

// ─── Write operations (all via safeRun) ─────────────────────────────────────

export function insertRecord(record: AttendanceRecord): void {
  const database = getDatabase();
  safeRun(
    database,
    `INSERT INTO records (id, date, type, shiftType, imagePath, ocrTime, ocrConfidence, confirmedTime, isManuallyEdited, isSynced, createdAt, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.date,
      record.type,
      record.shiftType,
      record.imagePath,
      record.ocrTime,
      record.ocrConfidence,
      record.confirmedTime,
      record.isManuallyEdited,
      record.isSynced,
      record.createdAt,
      record.note || null,
    ],
    'insertRecord'
  );
}

export function updateRecordTime(id: string, confirmedTime: string, originalOcrTime: string | null): void {
  const database = getDatabase();
  safeRun(
    database,
    `UPDATE records SET confirmedTime = ?, isManuallyEdited = 1, ocrTime = COALESCE(ocrTime, ?) WHERE id = ?`,
    [confirmedTime, originalOcrTime ?? null, id],
    'updateRecordTime'
  );
}

export function updateRecordNote(id: string, note: string): void {
  const database = getDatabase();
  safeRun(database, `UPDATE records SET note = ? WHERE id = ?`, [note, id], 'updateRecordNote');
}

export function deleteRecordById(id: string): string | null {
  const database = getDatabase();
  const row = safeQuery<{ imagePath: string }>(
    database,
    `SELECT imagePath FROM records WHERE id = ?`,
    [id],
    'first',
    'deleteRecordById:select'
  );
  if (!row) return null;
  safeRun(database, `DELETE FROM records WHERE id = ?`, [id], 'deleteRecordById');
  return row.imagePath;
}

export function deleteRecordsBeforeDate(beforeDateStr: string): string[] {
  const database = getDatabase();
  const rows = safeQuery<{ imagePath: string }[]>(
    database,
    `SELECT imagePath FROM records WHERE date < ?`,
    [beforeDateStr],
    'all',
    'deleteRecordsBeforeDate:select'
  );
  safeRun(database, `DELETE FROM records WHERE date < ?`, [beforeDateStr], 'deleteRecordsBeforeDate');
  return (rows ?? []).map(r => r.imagePath);
}

// ─── TASK 4: safeQuery — the mandatory READ wrapper ──────────────────────────
/**
 * MANDATORY SAFETY LAYER for READ operations.
 * Every read from SQLite MUST go through safeQuery().
 *
 * Same sanitization as safeRun but for getFirstSync / getAllSync.
 * Prevents Kotlin JSI bridge crashes from non-primitive values.
 */
function safeQuery<T = any>(
  database: SQLite.SQLiteDatabase,
  sql: string,
  params: unknown[],
  mode: 'first' | 'all',
  caller = 'unknown'
): T | null {
  const hasUnsafe = params.some(
    p => p !== null && p !== undefined && typeof p === 'object' && !(p instanceof Date)
  );
  if (hasUnsafe) {
    dbLog('warn', caller, params);
  } else if (__DEV_DB__) {
    dbLog('info', caller, params);
  }

  const safe = params.map(toSafe) as SQLite.SQLiteBindParams;

  try {
    if (mode === 'first') {
      return database.getFirstSync<T>(sql, safe);
    }
    return database.getAllSync<T>(sql, safe) as unknown as T;
  } catch (err) {
    console.error(`[DB:safeQuery][${caller}] ${mode}Sync error after sanitization:`, err);
    if (mode === 'first') return null;
    return [] as unknown as T;
  }
}

// ─── Read operations (all via safeQuery) ─────────────────────────────────────

export function getRecordsByDate(date: string): AttendanceRecord[] {
  const database = getDatabase();
  const rows = safeQuery<any[]>(
    database,
    `SELECT * FROM records WHERE date = ? ORDER BY createdAt ASC`,
    [date],
    'all',
    'getRecordsByDate'
  );
  return (rows ?? []).map(rowToRecord);
}

export function getAllDates(): string[] {
  const database = getDatabase();
  const rows = safeQuery<{ date: string }[]>(
    database,
    `SELECT DISTINCT date FROM records ORDER BY date DESC`,
    [],
    'all',
    'getAllDates'
  );
  return (rows ?? []).map(r => r.date);
}

export function getRecordById(id: string): AttendanceRecord | null {
  const database = getDatabase();
  const row = safeQuery<any>(
    database,
    `SELECT * FROM records WHERE id = ?`,
    [id],
    'first',
    'getRecordById'
  );
  if (!row) return null;
  return rowToRecord(row);
}

export function getRecordsByMonth(year: number, month: number): AttendanceRecord[] {
  const database = getDatabase();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = safeQuery<any[]>(
    database,
    `SELECT * FROM records WHERE date LIKE ? ORDER BY date ASC, createdAt ASC`,
    [`${prefix}%`],
    'all',
    'getRecordsByMonth'
  );
  return (rows ?? []).map(rowToRecord);
}

export function getRecordsByDateRange(startDate: string, endDate: string): AttendanceRecord[] {
  const database = getDatabase();
  const rows = safeQuery<any[]>(
    database,
    `SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date ASC, createdAt ASC`,
    [startDate, endDate],
    'all',
    'getRecordsByDateRange'
  );
  return (rows ?? []).map(rowToRecord);
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function rowToRecord(row: any): AttendanceRecord {
  return {
    id: row.id,
    date: row.date,
    type: row.type as RecordType,
    shiftType: row.shiftType as ShiftType,
    imagePath: row.imagePath,
    ocrTime: row.ocrTime,
    ocrConfidence: row.ocrConfidence,
    confirmedTime: row.confirmedTime,
    isManuallyEdited: row.isManuallyEdited === 1,
    isSynced: row.isSynced === 1,
    createdAt: row.createdAt,
    note: row.note || undefined,
  };
}
