export interface ProcessedImage {
  content: Buffer;
  extension: string;
}

/**
 * Port: resizes images before they are stored, and drops their metadata (GPS position...).
 * Both methods throw a DomainException when the file is not a readable image.
 */
export abstract class ImageProcessor {
  /** Square photo, small enough for the app. */
  abstract toProfilePhoto(content: Buffer): Promise<ProcessedImage>;

  /** Keeps the whole picture, large enough to read a licence or a plate. */
  abstract toDocumentImage(content: Buffer): Promise<ProcessedImage>;
}
