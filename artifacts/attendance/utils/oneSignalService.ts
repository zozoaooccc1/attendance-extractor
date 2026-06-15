import { Platform } from 'react-native';
import { OneSignal, LogLevel } from 'react-native-onesignal';

const ONESIGNAL_APP_ID = '4b67803a-e800-4f83-974b-32615789ed23';

/**
 * تهيئة OneSignal — يجب استدعاؤه مرة واحدة عند بدء التطبيق
 */
export function initOneSignal(): void {
  if (Platform.OS === 'web') return;
  OneSignal.Debug.setLogLevel(LogLevel.None);
  OneSignal.initialize(ONESIGNAL_APP_ID);
  // طلب إذن الإشعارات (يظهر popup للمستخدم مرة واحدة فقط)
  OneSignal.Notifications.requestPermission(true);
}

/**
 * ربط المستخدم بمعرّف خارجي (اختياري — لاستهداف مستخدم بعينه)
 */
export function setOneSignalUser(userId: string): void {
  if (Platform.OS === 'web') return;
  OneSignal.login(userId);
}

/**
 * تسجيل خروج المستخدم من OneSignal
 */
export function logoutOneSignal(): void {
  if (Platform.OS === 'web') return;
  OneSignal.logout();
}
