/** "Andraharo, Galaxy" -> "andraharo galaxy": lower case, no accents, no punctuation (for search). */
export const searchKey = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** True when every word of `query` starts a word of `text` ("67", "aero" and "ivato aer" all find "Ivato, aéroport"). */
export function matchesSearch(text: string, query: string): boolean {
  const words = searchKey(text).split(' ');
  return searchKey(query)
    .split(' ')
    .filter(Boolean)
    .every((part) => words.some((word) => word.startsWith(part)));
}
