import { Directory, File, Paths } from 'expo-file-system';

const PHOTOS_FOLDER = 'driver-photos';

/**
 * Native camera files are temporary (cache): moved into the document directory,
 * the photo is still there after a restart, so the waiting screen can show it.
 * Returns the new URI, saved by the server as the document's file.
 */
export async function keepPhoto(temporaryUri: string, name: string): Promise<string> {
  const folder = new Directory(Paths.document, PHOTOS_FOLDER);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  const target = new File(folder, `${name}-${Date.now()}.jpg`);
  await new File(temporaryUri).move(target);
  return target.uri;
}
