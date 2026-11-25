import { DomainException } from '../../domain/exception/DomainException';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** A file received from the app, before any processing. */
export interface UploadedImage {
  content: Buffer;
  mimeType: string;
}

/** Throws unless a JPEG, PNG or WebP picture was sent. */
export function assertImage(file: UploadedImage | undefined): asserts file is UploadedImage {
  if (!file || !IMAGE_TYPES.includes(file.mimeType)) {
    throw new DomainException('invalid', 'Envoie une photo au format JPEG, PNG ou WebP (5 Mo maximum).');
  }
}
