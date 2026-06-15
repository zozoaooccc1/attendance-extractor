import { Platform } from 'react-native';

// OneSignal معطّل مؤقتاً — يحتاج إعداد Firebase
// سنُفعّله لاحقاً عند ربط Firebase

export function initOneSignal(): void {
  // OneSignal disabled - requires Firebase setup
  console.log('OneSignal: disabled, Firebase not configured');
}

export function setOneSignalUser(userId: string): void {
  // OneSignal disabled
  console.log('OneSignal: setOneSignalUser disabled');
}

export function logoutOneSignal(): void {
  // OneSignal disabled  
  console.log('OneSignal: logout disabled');
}
