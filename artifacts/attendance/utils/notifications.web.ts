import { ShiftType } from '@/constants/types';

export async function requestNotificationPermissions(): Promise<boolean> { return false; }
export async function scheduleSingleShiftReminders(): Promise<void> {}
export async function scheduleDoubleShiftReminders(): Promise<void> {}
export async function schedulePersistentReminders(_shiftType: ShiftType): Promise<void> {}
export async function scheduleCheckInReminder(_h: number, _m: number): Promise<string | null> { return null; }
export async function scheduleCheckOutReminder(_h: number, _m: number): Promise<string | null> { return null; }
export async function sendImmediateAlert(_t: string, _b: string): Promise<void> {}
export async function cancelAllAttendanceReminders(): Promise<void> {}
