import type { AppSettings } from "./settings";
import { money } from "./format";

export function sanitizeNumber(n: string): string {
  return n.replace(/[^\d]/g, "");
}

export function buildWhatsAppLink(number: string, text: string): string | null {
  const clean = sanitizeNumber(number);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export interface WaOrderLine {
  name: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  printDetails?: string;
}

export interface WaOrderOptions {
  customerName?: string;
  notes?: string;
  hasMadeToOrder?: boolean;
}

export function buildOrderMessage(
  settings: AppSettings,
  lines: WaOrderLine[],
  opts: WaOrderOptions = {}
): string {
  const parts: string[] = [];
  parts.push(`مرحبًا، أرغب بطلب من ${settings.shopName}:`);
  for (const l of lines) {
    const subTotal = money(l.unitPrice * l.quantity, settings.currency, settings.currencyPosition);
    let line = `• ${l.name} (${l.sku}) — مقاس ${l.size} — لون ${l.color} — كمية ${l.quantity} — ${subTotal}`;
    if (l.printDetails) line += `\n   الطباعة المخصصة: ${l.printDetails}`;
    parts.push(line);
  }
  const baseTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = baseTotal + (opts.hasMadeToOrder ? 0 : 0) + settings.deliveryFee;
  if (settings.deliveryFee > 0) {
    parts.push(`التوصيل: ${money(settings.deliveryFee, settings.currency, settings.currencyPosition)}`);
  }
  parts.push(`الإجمالي: ${money(total, settings.currency, settings.currencyPosition)}`);
  if (opts.hasMadeToOrder) {
    parts.push(`نوع الطلب: صنع عند الطلب — مدة التجهيز: ${settings.defaultLeadTime}`);
  }
  if (settings.shamCashNumber) {
    parts.push(
      `الدفع: تحويل شام كاش ${settings.shamCashNumber} أو عند الاستلام`
    );
  }
  if (opts.customerName) parts.push(`الاسم: ${opts.customerName}`);
  if (opts.notes) parts.push(opts.notes);
  parts.push("شكرًا لك");
  return parts.join("\n");
}

export function buildQuickOrderMessage(
  shopName: string,
  name: string,
  sku: string,
  size: string,
  color: string
): string {
  return `مرحبًا، من ${shopName}
أرغب بطلب هذا المنتج فورًا:
${name} (${sku}) — مقاس ${size} — لون ${color}`;
}

export function buildCustomPrintMessage(settings: AppSettings): string {
  return `مرحبًا، من ${settings.shopName}
أريد طباعة فكرة خاصة بي:
(اكتب فكرتك هنا أو أرفق تصميمك).`;
}

export function buildInvoiceMessage(
  settings: AppSettings,
  invoiceNo: string,
  orderNo: string,
  total: number
): string {
  return `مرحبًا، من ${settings.shopName}
فاتورتك رقم ${invoiceNo} (طلب: ${orderNo}) جاهزة بمبلغ ${money(total, settings.currency, settings.currencyPosition)}.
${
  settings.shamCashNumber
    ? `للدفع عبر شام كاش: ${settings.shamCashNumber}`
    : ""
}
شكرًا لثقتك`;
}