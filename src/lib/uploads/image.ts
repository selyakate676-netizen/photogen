export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedImageMime = keyof typeof MIME_EXTENSIONS;

export class ImageUploadValidationError extends Error {
  readonly status: 400 | 413;

  constructor(message: string, status: 400 | 413) {
    super(message);
    this.status = status;
  }
}

function hasPrefix(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length >= 3 && hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length >= 8 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    bytes.length >= 12
    && hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46])
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function validateImageUpload(file: File): Promise<{
  body: Buffer;
  contentType: AllowedImageMime;
  extension: string;
}> {
  if (file.size < 1) throw new ImageUploadValidationError("Image file is empty", 400);
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new ImageUploadValidationError("Image file exceeds the 15 MB limit", 413);
  if (!(file.type in MIME_EXTENSIONS)) throw new ImageUploadValidationError("Only JPEG, PNG or WebP images are allowed", 400);

  const body = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageMime(body);
  if (!detectedType || detectedType !== file.type) {
    throw new ImageUploadValidationError("Image content does not match its MIME type", 400);
  }

  return { body, contentType: detectedType, extension: MIME_EXTENSIONS[detectedType] };
}
