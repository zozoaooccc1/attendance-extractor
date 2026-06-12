import * as FileSystem from 'expo-file-system';

export const IMAGES_DIR = `${FileSystem.documentDirectory ?? ''}attendance_images/`;

export async function ensureImagesDir(): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

export async function saveImage(uri: string, recordId: string): Promise<string> {
  if (!FileSystem.documentDirectory) throw new Error('FileSystem غير متاح');
  await ensureImagesDir();
  const filename = `${recordId}.jpg`;
  const destPath = IMAGES_DIR + filename;

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const result = await FileSystem.downloadAsync(uri, destPath);
    if (result.status !== 200) throw new Error(`فشل تنزيل الصورة: HTTP ${result.status}`);
    return destPath;
  }

  // First attempt: direct copy (works for file:// URIs)
  try {
    await FileSystem.copyAsync({ from: uri, to: destPath });
    // Verify the file was actually written
    const info = await FileSystem.getInfoAsync(destPath);
    if (info.exists && 'size' in info && (info as any).size > 0) return destPath;
    throw new Error('الملف فارغ بعد النسخ');
  } catch {
    // Fallback: read as base64 then write (works for content:// URIs on Android 10+)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64 || base64.length < 100) throw new Error('بيانات الصورة غير صالحة');
      await FileSystem.writeAsStringAsync(destPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return destPath;
    } catch (b64Err) {
      throw new Error(`فشل حفظ الصورة: ${b64Err instanceof Error ? b64Err.message : String(b64Err)}`);
    }
  }
}

export async function getImageUri(imagePath: string): Promise<string> {
  return imagePath;
}

export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(imagePath);
    if (info.exists) await FileSystem.deleteAsync(imagePath);
  } catch {}
}
