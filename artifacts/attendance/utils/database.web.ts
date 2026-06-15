import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceRecord, ShiftType, RecordType } from '@/constants/types';

const RECORDS_KEY = 'attendance_records';

async function getAllRecords(): Promise<AttendanceRecord[]> {
  try {
    const data = await AsyncStorage.getItem(RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

async function saveAllRecords(records: AttendanceRecord[]): Promise<void> {
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function initDatabase(): void {}

export function insertRecord(record: AttendanceRecord): void {
  getAllRecords().then(recs => saveAllRecords([...recs, record]));
}

export function updateRecordTime(id: string, confirmedTime: string, originalOcrTime: string | null): void {
  getAllRecords().then(recs => {
    const updated = recs.map(r =>
      r.id === id ? { ...r, confirmedTime, isManuallyEdited: true, ocrTime: r.ocrTime ?? originalOcrTime } : r
    );
    saveAllRecords(updated);
  });
}

export function updateRecordNote(id: string, note: string): void {
  getAllRecords().then(recs => {
    saveAllRecords(recs.map(r => r.id === id ? { ...r, note } : r));
  });
}

export function deleteRecordById(_id: string): string | null { return null; }
export function deleteRecordsBeforeDate(_beforeDateStr: string): string[] { return []; }
export function getRecordsByDate(_date: string): AttendanceRecord[] { return []; }
export function getAllDates(): string[] { return []; }
export function getRecordById(_id: string): AttendanceRecord | null { return null; }
export function getRecordsByMonth(_year: number, _month: number): AttendanceRecord[] { return []; }
export function getRecordsByDateRange(_start: string, _end: string): AttendanceRecord[] { return []; }
export function getDatabase(): any { return null; }
