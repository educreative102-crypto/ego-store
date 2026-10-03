import { StockPolicy, OrderStatus, OrderSource } from "@prisma/client";
import { after } from "next/server";
import { prisma } from "../prisma";
import { setSetting } from "../settings";
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

const PENDING_AT_KEY = "SHEETS_PENDING_AT";
const LOCK_KEY = "SHEETS_SYNC_LOCK";
const LOCK_TTL_MS = 60_000;

// يعلّم الحاجة لمزامنة: كتابة صف واحد (رخيصة وتتكاثر تلقائيًا، عشر تغييرات
// متتالية = كتابة واحدة عند التصريف).
//
// ننتظر كتابة العَلَم قبل العودة. لو تركناها `void` لكانت تفounced على استجابة
// قد تُجمَّد أو تُقتل قبل وصولها لقاعدة البيانات، فيضيع الطلب بصمت.
// ثم نضع العمل الثقيل داخل after() من next/server لا setTimeout: يضمن Next بقاء
// الدالة حيّة حتى ينتهي تنفيذها — وهو ما ينصّ عليه PLAN.md صراحةً.
export async function triggerSheetsSync(): Promise<void> {
  try {
    await markPending();
  } catch (error) {
    console.error("[sheets] تعذّر تسجيل طلب المزامنة:", error);
    return;
  }
  try {
    after(async () => {
      await drainSheetsSync();
    });
  } catch (error) {
    console.error("[sheets] تعذّر جدولة المزامنة بعد الاستجابة:", error);
  }
}

async function markPending(): Promise<void> {
  await setSetting(PENDING_AT_KEY, new Date().toISOString());
}

async function acquireLock(): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  try {
    await prisma.setting.create({ data: { key: LOCK_KEY, value: "" } });
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
  }
  const taken = await prisma.setting.updateMany({
    where: {
      key: LOCK_KEY,
      OR: [{ value: { lt: staleIso } }, { value: "" }],
    },
    data: { value: nowIso },
  });
  return taken.count === 1;
}

async function releaseLock(): Promise<void> {
  await prisma.setting
    .updateMany({ where: { key: LOCK_KEY }, data: { value: "" } })
    .catch(() => undefined);
}

// القيم نصوص ISO فينطقها الترتيب المعجمي = الترتيب الزمني.
async function clearPendingUpTo(snapshotAt: string): Promise<void> {
  await prisma.setting.updateMany({
    where: {
      key: PENDING_AT_KEY,
      OR: [{ value: { lt: snapshotAt } }, { value: "" }],
    },
    data: { value: "" },
  });
}

export async function drainSheetsSync(options: { force?: boolean } = {}): Promise<SyncResult> {
  if (!(await sheetsConfigured())) {
    await setSetting("googleSheetStatus", "غير مربوط");
    return { ok: false, message: "المزامنة غير مفعلة — اربط الجدول من الإعدادات" };
  }

  if (!(await acquireLock())) {
    return { ok: false, message: "مزامنة أخرى قيد التنفيذ — تم دمج الطلب" };
  }

  try {
    const [pendingRow, lastRow] = await Promise.all([
      prisma.setting.findUnique({ where: { key: PENDING_AT_KEY } }),
      prisma.setting.findUnique({ where: { key: "lastSyncAt" } }),
    ]);
    const pendingAt = pendingRow?.value ?? "";
    if (!pendingAt) {
      if (!options.force) return { ok: true, message: "لا توجد تغييرات تحتاج مزامنة" };
    } else if (!options.force && (lastRow?.value ?? "") >= pendingAt) {
      return { ok: true, message: "الجدول محدث بالفعل" };
    }
    return await syncSheets();
  } finally {
    await releaseLock();
  }
}

// زر «زامن الآن»: يمرّ بنفس القفل كي لا تتقاطع مع مزامنة خلفية جارية،
// لكنه يتجاوز اختصار «لا جديد» لأن الأدمن طلب مزامنة صريحة.
export async function forceSyncSheets(): Promise<SyncResult> {
  await markPending();
  return drainSheetsSync({ force: true });
}

// غير مصدَّرة عمدًا: كل المزامنة تمرّ من drainSheetsSync حتى تُقفل ولا تتداخل.
async function syncSheets(): Promise<SyncResult> {
  const api = await getSheetsApi();
  if (!api) {
    await setSetting("googleSheetStatus", "غير مربوط");
    return { ok: false, message: "المزامنة غير مفعلة — اربط الجدول من الإعدادات" };
  }

  // لقطة زمنية قبل قراءة البيانات: لا نمسح علم "يحتاج مزامنة" إلا إذا لم يتغيّر
  // بعد هذه اللحظة — وإلا مسحنا طلب تغيّر أثناء القراءة فبقي الجدول ناقصًا.
  const snapshotAt = new Date().toISOString();

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

    await setSetting("lastSyncAt", new Date().toISOString());
    await clearPendingUpTo(snapshotAt);
    await setSetting("googleSheetStatus", "متصل");
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