export function slugify(text: string, fallback = "product"): string {
  const map: Record<string, string> = {
    " ": "-", "أ": "a", "إ": "a", "آ": "a", "ا": "a", "ب": "b", "ت": "t",
    "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "th", "ر": "r",
    "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
    "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m",
    "ن": "n", "ه": "h", "و": "w", "ي": "y", "ة": "h", "ى": "a", "ئ": "a",
    "ء": "",
  };
  const normalized = Array.from(text.toLowerCase())
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}