const DEFAULT_CURRENCY = "$";

export function money(amount: number, currency = DEFAULT_CURRENCY, position: "before" | "after" = "after"): string {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
  return position === "before" ? `${currency}${value}` : `${value}${currency}`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-SY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-SY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// سوريا UTC+3 بلا توقيت صيفي. حدود اليوم والشهر تُحسب بهذا الإزاحة لا بتوقيت
// الخادم (UTC على Vercel) وإلا تأخّرت أرقام «اليوم» و«الشهر» ثلاث ساعات.
const SHOP_UTC_OFFSET_MS = 3 * 60 * 60_000;

export function shopStartOfDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + SHOP_UTC_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - SHOP_UTC_OFFSET_MS);
}

export function shopStartOfMonth(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + SHOP_UTC_OFFSET_MS);
  const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
  return new Date(start - SHOP_UTC_OFFSET_MS);
}