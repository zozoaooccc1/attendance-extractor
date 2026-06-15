import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_HASH_KEY = 'attendance_pin_hash_v1';
const PIN_ENABLED_KEY = 'attendance_pin_enabled_v1';
const PIN_SALT_KEY = 'attendance_pin_salt_v1';

/**
 * إنشاء ملح عشوائي
 */
function generateSalt(): string {
  const arr = new Uint32Array(4);
  // استخدام crypto إذا كان متاحاً، وإلا Math.random
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
      return Array.from(arr, v => v.toString(36)).join('');
    }
  } catch {}
  // احتياطي
  return Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 10)).join('');
}

/**
 * تجزئة PIN مع ملح باستخدام خوارزمية محسّنة
 * تطبق DJB2 مع الملح وتعيد التكرار 1000 مرة لزيادة المقاومة
 */
function hashPin(pin: string, salt: string): string {
  let h = 5381;
  const input = salt + pin + salt;
  // 1000 تكرار لزيادة صعوبة كسر التجزئة
  for (let round = 0; round < 1000; round++) {
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) + h) ^ input.charCodeAt(i);
      h = h >>> 0;
    }
    // إضافة رقم التكرار للتنويع
    h ^= round;
    h = h >>> 0;
  }
  return h.toString(36);
}

export async function setPIN(pin: string): Promise<void> {
  if (!pin || pin.length < 4) {
    throw new Error('يجب أن يكون رمز PIN 4 أرقام على الأقل');
  }
  const salt = generateSalt();
  const hash = hashPin(pin, salt);
  await AsyncStorage.multiSet([
    [PIN_HASH_KEY, hash],
    [PIN_SALT_KEY, salt],
    [PIN_ENABLED_KEY, '1'],
  ]);
}

export async function verifyPIN(pin: string): Promise<boolean> {
  try {
    const [storedHash, salt] = await AsyncStorage.multiGet([PIN_HASH_KEY, PIN_SALT_KEY]);
    if (!storedHash[1] || !salt[1]) return false;
    return storedHash[1] === hashPin(pin, salt[1]);
  } catch {
    return false;
  }
}

export async function disablePIN(): Promise<void> {
  await AsyncStorage.multiRemove([PIN_HASH_KEY, PIN_SALT_KEY]);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
}

export async function isPINEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PIN_ENABLED_KEY);
    const hashExists = await AsyncStorage.getItem(PIN_HASH_KEY);
    // حالة متسقة: مفعّل مع تجزئة موجودة
    if (v === '1' && hashExists) return true;
    // حالة غير متسقة: مفعّل بدون تجزئة — إصلاح تلقائي
    if (v === '1' && !hashExists) {
      await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
      return false;
    }
    return false;
  } catch {
    return false;
  }
}
