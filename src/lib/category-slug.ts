import { slugify } from "./slug";

export function categorySlugFrom(name: string, explicit?: string): string {
  const source = (explicit ?? "").trim() || name.trim();
  return slugify(source.toLowerCase(), "category");
}

export function uniqueCategorySlug(base: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (slug) => slug.toLowerCase()));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
