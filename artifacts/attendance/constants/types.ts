export type ShiftType = 'single' | 'double';
export type RecordType = 'entry1' | 'exit1' | 'entry2' | 'exit2';
export type ConfidenceLevel = 'high' | 'low' | 'manual';

export interface AttendanceRecord {
  id: string;
  date: string;
  type: RecordType;
  shiftType: ShiftType;
  imagePath: string;
  ocrTime: string | null;
  ocrConfidence: number | null;
  confirmedTime: string;
  isManuallyEdited: boolean;
  isSynced: boolean;
  createdAt: number;
  note?: string;
}

export interface DayRecord {
  date: string;
  shiftType: ShiftType;
  records: AttendanceRecord[];
}

export const RECORD_LABELS: Record<RecordType, string> = {
  entry1: 'دخول',
  exit1: 'خروج',
  entry2: 'دخول 2',
  exit2: 'خروج 2',
};

export const RECORD_ORDER: RecordType[] = ['entry1', 'exit1', 'entry2', 'exit2'];
