export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface SelectedReceiptFile {
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataBase64: string;
  previewUrl: string;
}

export function validateReceiptFileClient(
  file: File
): { valid: true } | { valid: false; reason: 'type' | 'size' } {
  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(mime)) {
    return { valid: false, reason: 'type' };
  }
  if (file.size <= 0 || file.size > MAX_RECEIPT_SIZE_BYTES) {
    return { valid: false, reason: 'size' };
  }
  return { valid: true };
}

export function readReceiptFileAsDataUrl(file: File): Promise<SelectedReceiptFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Could not read the selected image file.'));
        return;
      }
      resolve({
        fileName: file.name,
        mimeType: file.type === 'image/jpg' ? 'image/jpeg' : file.type,
        fileSize: file.size,
        dataBase64: result,
        previewUrl: result,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
