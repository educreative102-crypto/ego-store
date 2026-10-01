import { StockPolicy, OrderStatus, OrderSource } from "@prisma/client";
import { prisma } from "../prisma";
import { getSettings, setSetting } from "../settings";
import { ensureTabs, getSheetsApi, writeSheet, TAB_NAMES, sheetsConfigured } from "./client";
import { remaining } from "../inventory";
import { formatDate } from "../format";
import { CATEGORY_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "../labels";

export interface SyncResult {
  ok: boolean;
  message: string;
  counts?: { inventory: number; sales: number; invoices: number; profit: number };
}

const SOLD_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export function triggerSheetsSync(): void {
  void (async () => {
    try {
      const settings = await getSettings();
      if (!sheetsConfigured(settings)) return;
      await syncSheets();
    } catch {
      // مزامنة خلفية اختيارية — لا تُسقط العملية الحالية
    }
  })();
}

export async function syncSheets(): Promise<SyncResult> {
  const settings = await getSettings();
  const api = getSheetsApi(settings);
  if (!api) {
    await setSetting("googleSheetStatus", "غير مربوط");
    return { ok: false, message: "المزامنة غير مفعلة — اربط الجدول من الإعدادات" };
  }

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
      orderBy: { sku: "asc" },
    });

    const confirmedAgg = await prisma.orderItem.groupBy({
      by: ["productId", "size", "color"],
      where: { order: { status: { in: SOLD_STATUSES } } },
      _sum: { quantity: true },
    });
    const aggByKey = new Map<string, number>();
    for (const agg of confirmedAgg) {
      const key = `${agg.productId}|${agg.size}|${agg.color}`;
      aggByKey.set(key, (aggByKey.get(key) ?? 0) + (agg._sum.quantity ?? 0));
    }

    const orders = await prisma.order.findMany({
      where: { status: { not: OrderStatus.PENDING } },
      include: { items: { include: { product: true } }, invoice: true },
      orderBy: { createdAt: "asc" },
    });

    const inventoryRows: (string | number)[][] = [
      ["الرمز", "المنتج", "الفئة", "سياسة البيع", "المقاس", "اللون", "الوارد", "المؤكد", "المتبقي"],
    ];
    for (const p of products) {
      for (const v of p.variants) {
        if (p.stockPolicy === StockPolicy.MADE_TO_ORDER) {
          inventoryRows.push([p.sku, p.name, CATEGORY_LABEL[p.category], "صنع عند الطلب", v.size, v.color, "—", "—", "—"]);
        } else {
          const confirmedQty = aggByKey.get(`${p.id}|${v.size}|${v.color}`) ?? 0;
          inventoryRows.push([
            p.sku,
            p.name,
            CATEGORY_LABEL[p.category],
            "مخزون محدود",
            v.size,
            v.color,
            v.stockQty,
            confirmedQty,
            remaining({ stockQty: v.stockQty, confirmedQty }),
          ]);
        }
      }
    }

    const salesByKey = new Map<string, (string | number)[]>();
    for (const o of orders) {
      for (const item of o.items) {
        const key = `${o.orderNo}|${item.product.sku}|${item.size}|${item.color}|${item.printDetails || ""}`;
        const row = salesByKey.get(key);
        if (row) {
          row[10] = (row[10] as number) + item.quantity;
          row[12] = +((row[12] as number) + item.unitPrice * item.quantity).toFixed(2);
        } else {
          salesByKey.set(key, [
            o.orderNo,
            formatDate(o.createdAt),
            o.source === OrderSource.SITE ? "الموقع" : "واتساب",
            ORDER_STATUS_LABEL[o.status],
            o.customerName,
            item.product.sku,
            item.product.name,
            item.size,
            item.color,
            item.printDetails || "",
            item.quantity,
            item.unitPrice,
            +((item.unitPrice * item.quantity).toFixed(2)),
            PAYMENT_METHOD_LABEL[o.paymentMethod],
            PAYMENT_STATUS_LABEL[o.paymentStatus],
          ]);
        }
      }
    }
    const salesRows: (string | number)[][] = [
      ["رقم الطلب", "التاريخ", "المصدر", "الحالة", "العميل", "الرمز", "المنتج", "المقاس", "اللون", "الطباعة", "الكمية", "سعر الوحدة", "المبلغ", "طريقة الدفع", "حالة الدفع"],
      ...salesByKey.values(),
    ];

    const invoiceRows: (string | number)[][] = [
      ["رقم الفاتورة", "رقم الطلب", "التاريخ", "المبلغ", "حالة الطلب"],
    ];
    for (const o of orders) {
      if (!o.invoice) continue;
      invoiceRows.push([
        o.invoice.invoiceNo,
        o.orderNo,
        formatDate(o.invoice.issuedAt),
        o.invoice.amount,
        ORDER_STATUS_LABEL[o.status],
      ]);
    }

    const sold = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const profitRows: (string | number)[][] = [
      ["رقم الطلب", "التاريخ", "العميل", "الإيراد", "التكلفة", "الربح", "نسبة الربح %", "الحالة"],
    ];
    let revenue = 0;
    let cost = 0;
    for (const o of sold) {
      revenue += o.totalAmount;
      cost += o.totalCost;
      const margin = o.totalAmount === 0 ? 0 : ((o.totalAmount - o.totalCost) / o.totalAmount) * 100;
      profitRows.push([
        o.orderNo,
        formatDate(o.createdAt),
        o.customerName,
        o.totalAmount,
        o.totalCost,
        +(o.totalAmount - o.totalCost).toFixed(2),
        +margin.toFixed(1),
        ORDER_STATUS_LABEL[o.status],
      ]);
    }
    profitRows.push([]);
    profitRows.push(["الملخص", "", "", revenue, cost, +(revenue - cost).toFixed(2), revenue === 0 ? 0 : +(((revenue - cost) / revenue) * 100).toFixed(1), ""]);

    const writeAll = async (): Promise<void> => {
      await ensureTabs(api.client, api.spreadsheetId);
      await Promise.all([
        writeSheet(api.client, api.spreadsheetId, TAB_NAMES.inventory, inventoryRows),
        writeSheet(api.client, api.spreadsheetId, TAB_NAMES.sales, salesRows),
        writeSheet(api.client, api.spreadsheetId, TAB_NAMES.invoices, invoiceRows),
        writeSheet(api.client, api.spreadsheetId, TAB_NAMES.profit, profitRows),
      ]);
    };

    try {
      await writeAll();
    } catch (writeError) {
      console.error("[sheets] فشلت كتابة التبويبات — إعادة محاولة:", writeError);
      await writeAll();
    }

    await setSetting("googleSheetStatus", "متصل");
    await setSetting("lastSyncAt", new Date().toISOString());
    return {
      ok: true,
      message: "تمت المزامنة بنجاح",
      counts: {
        inventory: inventoryRows.length - 1,
        sales: salesRows.length - 1,
        invoices: invoiceRows.length - 1,
        profit: profitRows.length - 1,
      },
    };
  } catch (error) {
    console.error("[sheets] فشلت مزامنة Google Sheets:", error);
    await setSetting("googleSheetStatus", "خطأ في المزامنة");
    return {
      ok: false,
      message: error instanceof Error ? error.message : "خطأ غير معروف",
    };
  }
}