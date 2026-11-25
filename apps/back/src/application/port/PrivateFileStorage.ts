/** Route (under /api) that serves a private file behind a temporary signed link. */
export const PRIVATE_FILES_PATH = 'files';

export interface PrivateFile {
  content: Buffer;
  contentType: string;
}

/**
 * Port: stores private files (driver licences, selfies).
 * They are never public: the API hands out links that stop working after a few minutes.
 */
export abstract class PrivateFileStorage {
  /** Returns the key of the saved file (stored in the database, never a URL). */
  abstract save(folder: string, content: Buffer, extension: string): Promise<string>;

  /** Link valid for `expiresInSeconds`. */
  abstract temporaryUrl(key: string, expiresInSeconds: number): string;

  /** The file behind a temporary link, or null when the link is wrong, expired or the file is gone. */
  abstract readTemporary(key: string, expires: number, signature: string): Promise<PrivateFile | null>;
}
