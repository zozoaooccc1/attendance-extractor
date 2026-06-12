import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_HASH_KEY = 'attendance_pin_hash_v1';
const PIN_ENABLED_KEY = 'attendance_pin_enabled_v1';

function hashPin(pin: string): string {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) ^ pin.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(36);
}

export async function setPIN(pin: string): Promise<void> {
  await AsyncStorage.setItem(PIN_HASH_KEY, hashPin(pin));
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '1');
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  return stored === hashPin(pin);
}

export async function disablePIN(): Promise<void> {
  await AsyncStorage.removeItem(PIN_HASH_KEY);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
}

export async function isPINEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PIN_ENABLED_KEY);
  return v === '1';
}
