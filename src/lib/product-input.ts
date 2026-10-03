export function safeMoney(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function safeInt(value: unknown, fallback: number, min = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const whole = Math.trunc(n);
  return whole < min ? min : whole;
}

export interface RawVariant {
  size: string;
  color: string;
  stockQty: number;
}

export interface NormalizedVariant {
  size: string;
  color: string;
  stockQty: number;
}

// Variants تُحذف وتُعاد إنشاؤها عند كل حفظ، والمخطط يفرض تفرد
// (productId, size, color). تكرار واحد كان يُسقط المعاملة بالكامل — ومعها كل
// تعديلات المنتج التي أرسلها الأدمن. نأخذ آخر قيمة للمكرّر: التكرار سببه خلل في
// النموذج لا قصد مخزون موزّع، وجمع الكميات كان سيضاعف المخزون بصمت.
export function normalizeVariants(raw: RawVariant[]): NormalizedVariant[] {
  const merged = new Map<string, NormalizedVariant>();
  for (const v of raw) {
    const size = v.size.trim();
    const color = v.color.trim();
    if (!size || !color) continue;
    merged.set(`${size}|${color}`, { size, color, stockQty: safeInt(v.stockQty, 0) });
  }
  return [...merged.values()];
}