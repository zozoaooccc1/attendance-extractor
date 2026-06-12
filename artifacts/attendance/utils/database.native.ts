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

// ─── TASK 2: Global safety guard — patches runSync on the database instance ──
/**
 * Installs a one-time monkey-patch on the database's runSync method.
 * Even if a raw object bypasses safeRun() somehow, this last-resort guard
 * intercepts it, serializes it, and logs a warning before forwarding.
 */
function installGlobalGuard(database: SQLite.SQLiteDatabase): void {
  const proto = Object.getPrototypeOf(database) as any;
  if (proto.__guardInstalled) return;

  const original = proto.runSync as Function;
  proto.runSync = function patchedRunSync(sql: string, params?: unknown) {
    if (Array.isArray(params)) {
      const hasUnsafe = params.some(
        p => p !== null && typeof p === 'object' && !(p instanceof Date)
      );
      if (hasUnsafe) {
        console.warn('[DB:globalGuard] ⚠️  Unsafe object intercepted and fixed at global guard layer');
        params = (params as unknown[]).map(toSafe);
      }
    } else if (params !== null && params !== undefined && typeof params === 'object') {
      console.warn('[DB:globalGuard] ⚠️  Unsafe object intercepted and fixed at global guard layer');
      params = toSafe(params);
    }
    return original.call(this, sql, params);
  };
  proto.__guardInstalled = true;
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
    db = SQLite.openDatabaseSync('attendance.db');
    installGlobalGuard(db);
  }
  return db;
}

export function initDatabase(): void {
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
      record.note,
    ],
    'insertRecord'
  );
}

export function updateRecordTime(id: string, confirmedTime: string, originalOcrTime: string | null): void {
  const database = getDatabase();
  safeRun(
    database,
    `UPDATE records SET confirmedTime = ?, isManuallyEdited = 1, ocrTime = COALESCE(ocrTime, ?) WHERE id = ?`,
    [confirmedTime, originalOcrTime, id],
    'updateRecordTime'
  );
}

export function updateRecordNote(id: string, note: string): void {
  const database = getDatabase();
  safeRun(database, `UPDATE records SET note = ? WHERE id = ?`, [note, id], 'updateRecordNote');
}

export function deleteRecordById(id: string): string | null {
  const database = getDatabase();
  const row = database.getFirstSync<{ imagePath: string }>(`SELECT imagePath FROM records WHERE id = ?`, [id]);
  if (!row) return null;
  safeRun(database, `DELETE FROM records WHERE id = ?`, [id], 'deleteRecordById');
  return row.imagePath;
}

export function deleteRecordsBeforeDate(beforeDateStr: string): string[] {
  const database = getDatabase();
  const rows = database.getAllSync<{ imagePath: string }>(
    `SELECT imagePath FROM records WHERE date < ?`, [beforeDateStr]
  );
  safeRun(database, `DELETE FROM records WHERE date < ?`, [beforeDateStr], 'deleteRecordsBeforeDate');
  return rows.map(r => r.imagePath);
}

// ─── Read operations ─────────────────────────────────────────────────────────

export function getRecordsByDate(date: string): AttendanceRecord[] {
  const database = getDatabase();
  const rows = database.getAllSync<any>(
    `SELECT * FROM records WHERE date = ? ORDER BY createdAt ASC`,
    [date]
  );
  return rows.map(rowToRecord);
}

export function getAllDates(): string[] {
  const database = getDatabase();
  const rows = database.getAllSync<{ date: string }>(
    `SELECT DISTINCT date FROM records ORDER BY date DESC`
  );
  return rows.map(r => r.date);
}

export function getRecordById(id: string): AttendanceRecord | null {
  const database = getDatabase();
  const row = database.getFirstSync<any>(`SELECT * FROM records WHERE id = ?`, [id]);
  if (!row) return null;
  return rowToRecord(row);
}

export function getRecordsByMonth(year: number, month: number): AttendanceRecord[] {
  const database = getDatabase();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = database.getAllSync<any>(
    `SELECT * FROM records WHERE date LIKE ? ORDER BY date ASC, createdAt ASC`,
    [`${prefix}%`]
  );
  return rows.map(rowToRecord);
}

export function getRecordsByDateRange(startDate: string, endDate: string): AttendanceRecord[] {
  const database = getDatabase();
  const rows = database.getAllSync<any>(
    `SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date ASC, createdAt ASC`,
    [startDate, endDate]
  );
  return rows.map(rowToRecord);
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
    isSynced: row.isSynced !== 0,
    createdAt: row.createdAt,
    note: row.note ?? undefined,
  };
}
