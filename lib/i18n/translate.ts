import greek from './el.json';
export type Language = 'en' | 'el';
const dictionary: Record<string, string> = greek;
const folded = new Map(Object.entries(dictionary).map(([key, value]) => [key.toLowerCase(), value]));
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Patterns localize generated event messages without changing engine state or saved files.
const patterns = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).sort(([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length).map(([key, value]) => {
  const indices: number[] = [];
  const parts = key.split(/(\{\d+\})/g).map(part => {
    if (/^\{\d+\}$/.test(part)) { indices.push(Number(part.slice(1, -1))); return '(.*?)'; }
    return escapeRegex(part);
  });
  return { regex: new RegExp(`^${parts.join('')}$`), value, indices };
});
export function translate(text: string, language: Language, depth = 0): string {
  if (language === 'en' || !text || depth > 5) return text;
  const key = text.trim();
  let result = dictionary[key];
  if (!result) {
    const match = folded.get(key.toLowerCase());
    if (match) result = key === key.toUpperCase() ? match.toLocaleUpperCase('el') : key === key.toLowerCase() ? match.toLocaleLowerCase('el') : match;
  }
  if (!result) for (const pattern of patterns) {
    const match = key.match(pattern.regex);
    if (!match) continue;
    result = pattern.value.replace(/\{(\d+)\}/g, (_, id) => translate(match[pattern.indices.indexOf(Number(id)) + 1], language, depth + 1));
    break;
  }
  return result ? text.slice(0, text.length - text.trimStart().length) + result + text.slice(text.trimEnd().length) : text;
}
