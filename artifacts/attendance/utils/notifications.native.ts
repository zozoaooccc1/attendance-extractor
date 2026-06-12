import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Handler setup ────────────────────────────────────────────────────────────
// Called at app startup AND when permissions are granted to ensure
// foreground notifications always display.
let _handlerRegistered = false;

export function setupNotificationHandler(): void {
  if (_handlerRegistered) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowList: true,
      }),
    });
    _handlerRegistered = true;
  } catch {
    // Retry will happen next call
  }
}

// Register handler immediately at module load
setupNotificationHandler();

// ── Android channels ─────────────────────────────────────────────────────────
async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('attendance-reminders', {
      name: 'تذكيرات الحضور',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
    await Notifications.setNotificationChannelAsync('attendance-urgent', {
      name: 'تنبيهات عاجلة',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#ef4444',
    });
  } catch {}
}

// ── Permission request ────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // Ensure handler and channels are ready before granting permissions
    setupNotificationHandler();
    await ensureChannels();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Cancel all ───────────────────────────────────────────────────────────────
export async function cancelAllAttendanceReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// ── Single shift reminders ───────────────────────────────────────────────────
// Single shift: entry at 12:00, grace 12:15, exit at midnight (00:00)
export async function scheduleSingleShiftReminders(earlyMinutes = 0): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    await cancelAllAttendanceReminders();

    const early = Math.max(0, Math.min(earlyMinutes, 30));
    const channel = Platform.OS === 'android' ? 'attendance-reminders' : undefined;
    const urgentChannel = Platform.OS === 'android' ? 'attendance-urgent' : undefined;

    // Entry reminder (adjustable early minutes before 12:00)
    const entryHour = 11;
    const entryMin = 60 - early; // e.g. early=15 → 11:45
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🕐 موعد بصمة الدخول',
        body: early > 0
          ? `باقي ${early} دقيقة على موعد الدخول (12:00 م)`
          : 'حان موعد بصمة الدخول — 12:00 م',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: early > 0 ? entryHour : 12,
        minute: early > 0 ? entryMin % 60 : 0,
      },
    });

    // Grace limit warning (12:15)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ آخر موعد للبصمة',
        body: 'الوقت ينفد — آخر 15 دقيقة قبل احتساب التأخير (12:15 م)',
        sound: true,
        ...(urgentChannel ? { android: { channelId: urgentChannel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
      },
    });

    // Exit reminder (midnight = next day 00:00, schedule at 23:45)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 موعد بصمة الخروج',
        body: 'باقي 15 دقيقة على نهاية الدوام — لا تنسَ بصمة الخروج',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 23,
        minute: 45,
      },
    });
  } catch (err) {
    console.warn('[Notifications] scheduleSingleShiftReminders error:', err);
  }
}

// ── Double shift reminders ───────────────────────────────────────────────────
// Double: entry1 9:00, grace1 9:15, exit1 12:00, entry2 16:00, grace2 16:15, exit2 00:00
export async function scheduleDoubleShiftReminders(earlyMinutes = 0): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    await cancelAllAttendanceReminders();

    const early = Math.max(0, Math.min(earlyMinutes, 30));
    const channel = Platform.OS === 'android' ? 'attendance-reminders' : undefined;
    const urgentChannel = Platform.OS === 'android' ? 'attendance-urgent' : undefined;

    // Entry1 reminder (before 09:00)
    const e1Hour = early > 0 ? 8 : 9;
    const e1Min  = early > 0 ? 60 - early : 0;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 موعد دخول الشفت الأول',
        body: early > 0
          ? `باقي ${early} دقيقة على دخول الشفت الأول (9:00 ص)`
          : 'حان موعد بصمة دخول الشفت الأول — 9:00 ص',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: e1Hour,
        minute: e1Min % 60,
      },
    });

    // Grace1 warning (09:00)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ آخر موعد — الشفت الأول',
        body: 'آخر 15 دقيقة قبل احتساب التأخير في الشفت الأول (9:15 ص)',
        sound: true,
        ...(urgentChannel ? { android: { channelId: urgentChannel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    // Exit1 reminder (11:45)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 موعد خروج الشفت الأول',
        body: 'باقي 15 دقيقة على نهاية الشفت الأول — لا تنسَ البصمة (12:00 م)',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 11,
        minute: 45,
      },
    });

    // Entry2 reminder (before 16:00)
    const e2Hour = early > 0 ? 15 : 16;
    const e2Min  = early > 0 ? 60 - early : 0;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌆 موعد دخول الشفت الثاني',
        body: early > 0
          ? `باقي ${early} دقيقة على دخول الشفت الثاني (4:00 م)`
          : 'حان موعد بصمة دخول الشفت الثاني — 4:00 م',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: e2Hour,
        minute: e2Min % 60,
      },
    });

    // Grace2 warning (16:00)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ آخر موعد — الشفت الثاني',
        body: 'آخر 15 دقيقة قبل احتساب التأخير في الشفت الثاني (4:15 م)',
        sound: true,
        ...(urgentChannel ? { android: { channelId: urgentChannel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 16,
        minute: 0,
      },
    });

    // Exit2 reminder (23:45)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 نهاية الدوام — الشفت الثاني',
        body: 'باقي 15 دقيقة على نهاية الدوام الكامل — لا تنسَ البصمة',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 23,
        minute: 45,
      },
    });
  } catch (err) {
    console.warn('[Notifications] scheduleDoubleShiftReminders error:', err);
  }
}

// ── Persistent reminder (every X hours) ─────────────────────────────────────
export async function schedulePersistentReminders(intervalHours = 2): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    const channel = Platform.OS === 'android' ? 'attendance-reminders' : undefined;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 تذكير الحضور',
        body: 'تذكر تسجيل بصمتك في وقتها',
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: intervalHours * 3600,
        repeats: true,
      },
    });
  } catch (err) {
    console.warn('[Notifications] schedulePersistentReminders error:', err);
  }
}

// ── Immediate test alert ─────────────────────────────────────────────────────
export async function sendImmediateAlert(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    const channel = Platform.OS === 'android' ? 'attendance-urgent' : undefined;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(channel ? { android: { channelId: channel } } : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] sendImmediateAlert error:', err);
  }
}
