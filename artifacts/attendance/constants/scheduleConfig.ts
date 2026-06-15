import { ShiftType } from './types';

export interface GraceTime {
  hour: number;
  minute: number;
}

export const REGULAR_SINGLE: { entry1Grace: GraceTime } = {
  entry1Grace: { hour: 12, minute: 15 },
};

export const REGULAR_DOUBLE: { entry1Grace: GraceTime; entry2Grace: GraceTime } = {
  entry1Grace: { hour: 9, minute: 15 },
  entry2Grace: { hour: 16, minute: 15 },
};

export const FRIDAY_SCHEDULE: { entry1Grace: GraceTime; entry2Grace: GraceTime } = {
  entry1Grace: { hour: 14, minute: 15 },
  entry2Grace: { hour: 14, minute: 15 },
};

export function isFridayDate(date: Date): boolean {
  return date.getDay() === 5;
}

export function checkLateEntry(
  entryType: 'entry1' | 'entry2',
  confirmedTime: string,
  date: Date,
  shiftType: 'single' | 'double'
): { isLate: boolean; minutesLate: number; graceLimitStr: string } {
  const fri = isFridayDate(date);
  let grace: GraceTime;
  if (fri) {
    grace = entryType === 'entry1' ? FRIDAY_SCHEDULE.entry1Grace : FRIDAY_SCHEDULE.entry2Grace;
  } else if (shiftType === 'single') {
    grace = REGULAR_SINGLE.entry1Grace;
  } else {
    grace = entryType === 'entry1' ? REGULAR_DOUBLE.entry1Grace : REGULAR_DOUBLE.entry2Grace;
  }
  const [h, m] = confirmedTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return { isLate: false, minutesLate: 0, graceLimitStr: '' };
  const recordedMins = h * 60 + m;
  const graceMins = grace.hour * 60 + grace.minute;
  const isLate = recordedMins > graceMins;
  const graceLimitStr = `${String(grace.hour).padStart(2, '0')}:${String(grace.minute).padStart(2, '0')}`;
  return { isLate, minutesLate: isLate ? recordedMins - graceMins : 0, graceLimitStr };
}

// ─── Countdown helpers ───────────────────────────────────────────────────────

export interface TimerInfo {
  type: 'before_entry' | 'before_exit';
  ms: number;
  label: string;
  targetTime: string;
}

export function getNextEntryTime(shiftType: ShiftType, now: Date): Date {
  const fri = isFridayDate(now);
  const entry = new Date(now);
  if (fri) {
    entry.setHours(14, 0, 0, 0);
  } else if (shiftType === 'single') {
    entry.setHours(12, 0, 0, 0);
  } else {
    // double: entry1 at 9:00, entry2 at 16:00
    const entry1 = new Date(now); entry1.setHours(9, 0, 0, 0);
    const entry2 = new Date(now); entry2.setHours(16, 0, 0, 0);
    if (now < entry1) return entry1;
    if (now < entry2) return entry2;
    // past both — return tomorrow's entry1
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }
  if (now > entry) {
    entry.setDate(entry.getDate() + 1);
  }
  return entry;
}

export function formatEntryTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'م' : 'ص';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function formatGraceTime(g: GraceTime): string {
  const period = g.hour >= 12 ? 'م' : 'ص';
  const displayH = g.hour > 12 ? g.hour - 12 : g.hour === 0 ? 12 : g.hour;
  return `${displayH}:${String(g.minute).padStart(2, '0')} ${period}`;
}

export function getNextEntryGraceLabel(shiftType: ShiftType, now: Date): string {
  const fri = isFridayDate(now);
  if (fri) {
    return `سماح حتى ${formatGraceTime(FRIDAY_SCHEDULE.entry1Grace)}`;
  }
  if (shiftType === 'single') {
    return `سماح حتى ${formatGraceTime(REGULAR_SINGLE.entry1Grace)}`;
  }
  // double shift
  const entry1 = new Date(now); entry1.setHours(9, 0, 0, 0);
  const entry2 = new Date(now); entry2.setHours(16, 0, 0, 0);
  if (now < entry1 || now >= entry2) {
    return `سماح حتى ${formatGraceTime(REGULAR_DOUBLE.entry1Grace)}`;
  }
  return `سماح حتى ${formatGraceTime(REGULAR_DOUBLE.entry2Grace)}`;
}

export function getExpectedExitTime(shiftType: ShiftType, now: Date): Date {
  const fri = isFridayDate(now);
  if (fri || shiftType === 'single') {
    const exit = new Date(now);
    exit.setDate(exit.getDate() + 1);
    exit.setHours(0, 0, 0, 0);
    return exit;
  }
  // double shift: first exit at 12:00, second at midnight
  const noon = new Date(now);
  noon.setHours(12, 0, 0, 0);
  if (now < noon) return noon;
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} س ${m} د`;
  return `${m} دقيقة`;
}

// ─── Schedule labels ──────────────────────────────────────────────────────────

export function getScheduleLabel(shiftType: ShiftType, isFriday: boolean): string {
  if (isFriday) return 'دوام الجمعة: 2:00 م — 12:00 ص';
  if (shiftType === 'single') return 'شفت واحد: 12:00 م — 12:00 ص';
  return 'شفتين: 9:00 ص — 12:00 م  ثم  4:00 م — 12:00 ص';
}

// ─── Exit time per record type ────────────────────────────────────────────────
// Returns the scheduled exit time for exit1 or exit2 based on shift/day.
// 15 minutes before this time is the earliest a user can capture the exit photo.

export function getExitTime(type: 'exit1' | 'exit2', shiftType: ShiftType, now: Date): Date {
  const fri = isFridayDate(now);

  if (type === 'exit1') {
    if (!fri && shiftType === 'double') {
      // Double shift: exit1 is at noon 12:00
      const noon = new Date(now);
      noon.setHours(12, 0, 0, 0);
      return noon;
    }
    // Single / Friday: exit at midnight
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight;
  }

  // exit2 is always at midnight
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

// Returns the earliest allowed time to capture an exit photo (exactly at shift end — no early capture)
export function getEarliestExitCapture(type: 'exit1' | 'exit2', shiftType: ShiftType, now: Date): Date {
  return getExitTime(type, shiftType, now);
}

export function formatTimeHHMM(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
