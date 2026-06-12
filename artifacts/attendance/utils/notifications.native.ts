import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Handler setup ─────────────────────────────────────────────────────────────
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
  } catch {}
}

setupNotificationHandler();

// ── Android channels ──────────────────────────────────────────────────────────
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
    // ── NEW: alarm channel for 5-second burst ──────────────────────────────
    await Notifications.setNotificationChannelAsync('attendance-alarm', {
      name: '🚨 منبّه الدوام',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 800, 200, 800, 200, 800],
      lightColor: '#f97316',
      enableLights: true,
      enableVibrate: true,
      bypassDnd: true,        // يتجاوز وضع "عدم الإزعاج"
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {}
}

// ── Permission request ─────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
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

// ── Cancel all ────────────────────────────────────────────────────────────────
export async function cancelAllAttendanceReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// ── Helper: schedule a burst of alarms every 5s (Android) / 30s (iOS) ────────
// Fires one notification per interval for 15 minutes before the given time
async function scheduleAlarmWindow(
  entryHour: number,
  entryMinute: number,
  shiftLabel: string,
): Promise<void> {
  const INTERVAL_ANDROID = 5;   // seconds between each alarm on Android
  const INTERVAL_IOS     = 30;  // iOS: max 64 pending notifications so use 30s
  const WINDOW_SECONDS   = 15 * 60; // 15 minutes

  const interval = Platform.OS === 'android' ? INTERVAL_ANDROID : INTERVAL_IOS;
  const count = Math.floor(WINDOW_SECONDS / interval); // 180 or 30

  const alarmChannel = Platform.OS === 'android' ? 'attendance-alarm' : undefined;

  const now = new Date();
  // Today's entry time
  const todayEntry = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(),
    entryHour, entryMinute, 0, 0,
  );

  // Window start = entry - 15min
  const windowStart = new Date(todayEntry.getTime() - WINDOW_SECONDS * 1000);

  // If entire window already passed today → schedule for tomorrow
  const baseDate = windowStart.getTime() < now.getTime() - WINDOW_SECONDS * 1000
    ? new Date(windowStart.getTime() + 24 * 60 * 60 * 1000) // tomorrow
    : windowStart;

  const batch: Promise<string>[] = [];

  for (let i = 0; i < count; i++) {
    const fireTime = new Date(baseDate.getTime() + i * interval * 1000);
    if (fireTime.getTime() <= now.getTime()) continue; // skip past times

    const remainingMinutes = Math.ceil((todayEntry.getTime() - fireTime.getTime()) / 60000);
    const remainStr = remainingMinutes <= 1 ? 'دقيقة واحدة' : `${remainingMinutes} دقيقة`;

    batch.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${shiftLabel}`,
          body: `باقي ${remainStr} على موعد الدخول — استعد!`,
          sound: true,
          ...(alarmChannel ? { android: { channelId: alarmChannel } } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireTime,
        },
      }).catch(() => ''),
    );

    // Schedule in micro-batches to avoid blocking
    if (batch.length >= 30) {
      await Promise.all(batch.splice(0, 30));
    }
  }

  if (batch.length > 0) await Promise.all(batch);
}

// ── PUBLIC: schedule aggressive alarm burst before shift ──────────────────────
// Called when "المنبّه الصاخب" is enabled in settings
export async function scheduleAlarmBurst(
  shiftType: 'single' | 'double',
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    await cancelAllAttendanceReminders();

    if (shiftType === 'single') {
      // Single shift entry: 12:00
      await scheduleAlarmWindow(12, 0, 'موعد بصمة الدخول');
    } else {
      // Double shift entry1: 9:00, entry2: 16:00
      await scheduleAlarmWindow(9,  0, 'دخول الشفت الأول');
      await scheduleAlarmWindow(16, 0, 'دخول الشفت الثاني');
    }
  } catch (err) {
    console.warn('[Notifications] scheduleAlarmBurst error:', err);
  }
}

// ── Single shift normal reminders ─────────────────────────────────────────────
export async function scheduleSingleShiftReminders(earlyMinutes = 0): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    await cancelAllAttendanceReminders();

    const early = Math.max(0, Math.min(earlyMinutes, 30));
    const channel        = Platform.OS === 'android' ? 'attendance-reminders' : undefined;
    const urgentChannel  = Platform.OS === 'android' ? 'attendance-urgent'    : undefined;

    // Entry reminder (adjustable)
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
        hour: early > 0 ? 11 : 12,
        minute: early > 0 ? 60 - early : 0,
      },
    });

    // Grace limit warning (12:00)
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

    // Exit reminder (23:45)
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

// ── Double shift normal reminders ─────────────────────────────────────────────
export async function scheduleDoubleShiftReminders(earlyMinutes = 0): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    setupNotificationHandler();
    await ensureChannels();
    await cancelAllAttendanceReminders();

    const early = Math.max(0, Math.min(earlyMinutes, 30));
    const channel        = Platform.OS === 'android' ? 'attendance-reminders' : undefined;
    const urgentChannel  = Platform.OS === 'android' ? 'attendance-urgent'    : undefined;

    // Entry1 (09:00)
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
        hour: early > 0 ? 8 : 9,
        minute: early > 0 ? 60 - early : 0,
      },
    });

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

    // Exit1 (11:45)
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

    // Entry2 (16:00)
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
        hour: early > 0 ? 15 : 16,
        minute: early > 0 ? 60 - early : 0,
      },
    });

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

    // Exit2 (23:45)
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

// ── Persistent reminder (every X hours) ──────────────────────────────────────
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

// ── Immediate test alert ──────────────────────────────────────────────────────
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
