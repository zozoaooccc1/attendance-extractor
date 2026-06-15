import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { AttendanceRecord, ShiftType } from '@/constants/types';
import {
  initDatabase,
  insertRecord,
  getRecordsByDate,
  getAllDates,
  getRecordsByMonth,
  getRecordsByDateRange,
  deleteRecordsBeforeDate,
  deleteRecordById,
} from '@/utils/database';
import { getCompanyPeriod, CompanyPeriod } from '@/utils/timeService';

export { getCompanyPeriod, CompanyPeriod };

interface AttendanceContextType {
  todayRecords: AttendanceRecord[];
  allDates: string[];
  shiftType: ShiftType;
  setShiftType: (type: ShiftType) => void;
  addRecord: (record: AttendanceRecord) => void;
  getRecordForDate: (date: string) => AttendanceRecord[];
  getRecordForMonth: (year: number, month: number) => AttendanceRecord[];
  getRecordsByMonth: (year: number, month: number) => AttendanceRecord[];
  getRecordForPeriod: (startDate: string, endDate: string) => AttendanceRecord[];
  deleteOldRecords: (beforeDateStr: string) => string[];
  deleteRecord: (id: string) => string | null;
  refreshToday: () => void;
  refreshDates: () => void;
  currentCompanyPeriod: CompanyPeriod;
  isDbReady: boolean;
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

function todayStr(): string {
  // استخدام التاريخ المحلي للجهاز مع ضمان تنسيق ثابت
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [isDbReady, setIsDbReady] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [shiftType, setShiftType] = useState<ShiftType>('single');

  // إعادة حساب الفترة عند تغيير التاريخ (يُحدَّث عند التركيز)
  const [periodDate, setPeriodDate] = useState(() => new Date());
  const currentCompanyPeriod = useMemo(() => getCompanyPeriod(periodDate), [periodDate]);

  useEffect(() => {
    try {
      initDatabase();
      setIsDbReady(true);
    } catch (e) {
      console.error('[AttendanceContext] DB init error:', e);
      // حتى لو فشلت تهيئة قاعدة البيانات، نسمح للتطبيق بالعمل
      setIsDbReady(true);
    }
    try { loadTodayRecords(); } catch (e) { console.warn('[AttendanceContext] loadTodayRecords error on init:', e); }
    try { loadAllDates(); } catch (e) { console.warn('[AttendanceContext] loadAllDates error on init:', e); }
  }, []);

  // تحديث الفترة والسجلات يومياً عند منتصف الليل
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => {
      setPeriodDate(new Date());
      loadTodayRecords();
      loadAllDates();
    }, msUntilMidnight + 1000); // ثانية واحدة بعد منتصف الليل
    return () => clearTimeout(timer);
  }, [periodDate]);

  const loadTodayRecords = useCallback(() => {
    try {
      const records = getRecordsByDate(todayStr());
      setTodayRecords(records);
      if (records.length > 0) setShiftType(records[0].shiftType);
    } catch (e) {
      console.warn('[AttendanceContext] loadTodayRecords error:', e);
    }
  }, []);

  const loadAllDates = useCallback(() => {
    try {
      setAllDates(getAllDates());
    } catch (e) {
      console.warn('[AttendanceContext] loadAllDates error:', e);
    }
  }, []);

  const addRecord = useCallback((record: AttendanceRecord) => {
    // التحقق من الحقول المطلوبة
    if (!record.id || !record.date || !record.type || !record.shiftType || !record.confirmedTime || !record.createdAt) {
      throw new Error('فشل حفظ السجل: بيانات ناقصة');
    }
    try {
      insertRecord(record);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`فشل حفظ السجل: ${msg}`);
    }
    loadTodayRecords();
    loadAllDates();
  }, [loadTodayRecords, loadAllDates]);

  const getRecordForDate = useCallback((date: string): AttendanceRecord[] => {
    try { return getRecordsByDate(date); } catch { return []; }
  }, []);

  const getRecordForMonth = useCallback((year: number, month: number): AttendanceRecord[] => {
    try { return getRecordsByMonth(year, month); } catch { return []; }
  }, []);

  const getRecordForPeriod = useCallback((startDate: string, endDate: string): AttendanceRecord[] => {
    try { return getRecordsByDateRange(startDate, endDate); } catch { return []; }
  }, []);

  const deleteOldRecords = useCallback((beforeDateStr: string): string[] => {
    try {
      const paths = deleteRecordsBeforeDate(beforeDateStr);
      loadAllDates();
      loadTodayRecords();
      return paths;
    } catch { return []; }
  }, [loadAllDates, loadTodayRecords]);

  const deleteRecord = useCallback((id: string): string | null => {
    try {
      const imagePath = deleteRecordById(id);
      loadTodayRecords();
      loadAllDates();
      return imagePath;
    } catch { return null; }
  }, [loadTodayRecords, loadAllDates]);

  return (
    <AttendanceContext.Provider value={{
      todayRecords, allDates, shiftType, setShiftType,
      addRecord, getRecordForDate, getRecordForMonth,
      getRecordsByMonth: getRecordForMonth,
      getRecordForPeriod, deleteOldRecords, deleteRecord,
      refreshToday: loadTodayRecords, refreshDates: loadAllDates,
      currentCompanyPeriod, isDbReady,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used inside AttendanceProvider');
  return ctx;
}
