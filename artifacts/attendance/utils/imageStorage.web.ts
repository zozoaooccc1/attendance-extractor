export const IMAGES_DIR = '';

export async function ensureImagesDir(): Promise<void> {}

export async function saveImage(uri: string, recordId: string): Promise<string> {
  return uri;
}

export async function getImageUri(imagePath: string): Promise<string> {
  return imagePath;
}

export async function deleteImage(imagePath: string): Promise<void> {}
