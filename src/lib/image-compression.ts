import imageCompression from 'browser-image-compression';

export async function compressImageClientSide(file: File | Blob): Promise<File | Blob> {
  // If it's already a small file, or not an image, we might just return it
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 0.075, // 75 KB
    maxWidthOrHeight: 1280, // Keep resolution reasonable but highly compressed
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file as File, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Fallback to original file if compression fails
    return file;
  }
}
