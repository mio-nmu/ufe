/** Mongolian Cyrillic → Latin, the common romanisation used in URLs. */
const TRANSLIT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "ye",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "u",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "y",
  ь: "i",
  э: "e",
  ю: "yu",
  я: "ya",
};

/**
 * URL slug from a title or name: transliterated, lowercase, a–z/0–9 words
 * joined by "-", at most 80 characters ("Номчбаатар Наранбаатар" →
 * "nomchbaatar-naranbaatar").
 */
export function slugify(text: string): string {
  return [...text.toLowerCase()]
    .map((char) => TRANSLIT[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
