import { useState, useCallback } from 'react';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface UploadFileOptions {
  pathPrefix: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compressImage = useCallback(
    (file: File, options?: CompressOptions): Promise<string> => {
      const maxWidth = options?.maxWidth || 300;
      const maxHeight = options?.maxHeight || 300;
      const quality = options?.quality || 0.85;
      const format = options?.outputFormat || 'image/jpeg';

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(e.target?.result as string);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(format, quality);
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error('Failed to parse image'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const uploadFileToStorage = useCallback(
    async (file: File, pathPrefix: string): Promise<string> => {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `${pathPrefix}/${Date.now()}_${cleanFileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    },
    []
  );

  return {
    isUploading,
    setIsUploading,
    error,
    setError,
    compressImage,
    uploadFileToStorage,
  };
}

export default useMediaUpload;
