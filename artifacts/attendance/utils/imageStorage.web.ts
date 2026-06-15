export const IMAGES_DIR = '';

export async function ensureImagesDir(): Promise<void> {}

export async function saveImage(uri: string, recordId: string): Promise<string> {
  return uri;
}

export async function getImageUri(imagePath: string): Promise<string> {
  return imagePath;
}

export async function deleteImage(imagePath: string): Promise<void> {}

export async function getImagesStats(): Promise<{ count: number; totalMB: number }> {
  return { count: 0, totalMB: 0 };
}

export async function deleteImagesOlderThan(months: number): Promise<number> {
  return 0;
}

export async function readImageAsBase64(imagePath: string): Promise<string | null> {
  return null;
}

export async function writeImageFromBase64(recordId: string, base64: string): Promise<string | null> {
  return null;
}
