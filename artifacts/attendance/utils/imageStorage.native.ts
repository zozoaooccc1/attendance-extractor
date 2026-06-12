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

  try {
    await FileSystem.copyAsync({ from: uri, to: destPath });
    const info = await FileSystem.getInfoAsync(destPath);
    if (info.exists && 'size' in info && (info as any).size > 0) return destPath;
    throw new Error('الملف فارغ بعد النسخ');
  } catch {
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

// ── إحصاء الصور + حجمها ─────────────────────────────────────────────────────
export async function getImagesStats(): Promise<{ count: number; totalMB: number }> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) return { count: 0, totalMB: 0 };

    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    let totalBytes = 0;

    for (const file of files) {
      try {
        const info = await FileSystem.getInfoAsync(IMAGES_DIR + file, { size: true });
        if (info.exists && 'size' in info) totalBytes += (info as any).size ?? 0;
      } catch {}
    }

    return {
      count: files.length,
      totalMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
    };
  } catch {
    return { count: 0, totalMB: 0 };
  }
}

// ── حذف الصور الأقدم من X أشهر ──────────────────────────────────────────────
export async function deleteImagesOlderThan(months: number): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    const cutoffMs = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const file of files) {
      try {
        const info = await FileSystem.getInfoAsync(IMAGES_DIR + file, { size: true });
        if (!info.exists) continue;
        // استخدم modificationTime إذا متاح، وإلا استنتج من اسم الملف
        let fileTime = 0;
        if ('modificationTime' in info) {
          fileTime = ((info as any).modificationTime ?? 0) * 1000;
        } else {
          // recordId يبدأ بـ Date.now().toString(36) — ~8 حروف
          const idPart = file.replace('.jpg', '').substring(0, 9);
          const ts = parseInt(idPart, 36);
          if (!isNaN(ts) && ts > 1e12 && ts < 2e12) fileTime = ts;
        }
        if (fileTime > 0 && fileTime < cutoffMs) {
          await FileSystem.deleteAsync(IMAGES_DIR + file, { idempotent: true });
          deleted++;
        }
      } catch {}
    }
    return deleted;
  } catch {
    return 0;
  }
}

// ── قراءة صورة كـ base64 (للنسخ الاحتياطية الشاملة) ─────────────────────────
export async function readImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(imagePath);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(imagePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }
}

// ── كتابة صورة من base64 ──────────────────────────────────────────────────────
export async function writeImageFromBase64(recordId: string, base64: string): Promise<string | null> {
  try {
    await ensureImagesDir();
    const destPath = IMAGES_DIR + `${recordId}.jpg`;
    await FileSystem.writeAsStringAsync(destPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return destPath;
  } catch {
    return null;
  }
}
