/** Port: stores public files (profile photos) and gives their URL. */
export abstract class FileStorage {
  /** Returns the public URL of the saved file. */
  abstract save(folder: string, content: Buffer, extension: string): Promise<string>;

  /** Does nothing when the URL does not belong to this storage. */
  abstract remove(url: string): Promise<void>;
}
