"use server";

import { OrderSource, OrderStatus, PaymentMethod, PaymentStatus, Prisma, StockPolicy, Variant } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { orderTotal, orderCost } from "./inventory";
import { getSettings } from "./settings";
import { bumpCounter } from "./settings";
import { nextOrderNo, nextInvoiceNo } from "./order-keys";
import { triggerSheetsSync } from "./sheets/sync";
import { CATALOG_TAG } from "./catalog";
import { rateLimitHit } from "./rate-limit";

export interface BuyLine {
  productId: string;
  size: string;
  color: string;
  quantity: number;
  printDetails?: string;
}

interface CreateOrderInput {
  source: OrderSource;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  lines: BuyLine[];
}

const SOLD = [OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
const SITE_ORDER_LIMIT = { windowMs: 30 * 60_000, max: 5 };

export async function createOrderRecord(input: CreateOrderInput): Promise<{
  ok: boolean;
  message: string;
  orderId?: string;
  orderNo?: string;
}> {
  const cleanLines = input.lines.filter((l) => l.quantity > 0);
  if (cleanLines.length === 0) {
    return { ok: false, message: "لا توجد أصناف في الطلب" };
  }
  if (!input.customerName.trim()) {
    return { ok: false, message: "أدخل اسم الزبون" };
  }

  const productIds = [...new Set(cleanLines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items: {
    productId: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    printDetails: string;
  }[] = [];
  for (const line of cleanLines) {
    const product = productMap.get(line.productId);
    if (!product) return { ok: false, message: "منتج غير موجود" };
    items.push({
      productId: product.id,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      unitPrice: product.basePrice,
      unitCost: product.costPrice,
      printDetails: line.printDetails ?? "",
    });
  }

  const settings = await getSettings();
  const baseTotal = orderTotal(items.map((it) => ({ unitPrice: it.unitPrice, quantity: it.quantity })));
  const totalAmount = +(baseTotal + settings.deliveryFee).toFixed(2);
  const totalCost = orderCost(items.map((it) => ({ unitCost: it.unitCost, quantity: it.quantity })));

  const orderNo = nextOrderNo(await bumpCounter("ORD_COUNTER"));

  const order = await prisma.order.create({
    data: {
      orderNo,
      source: input.source,
      status: OrderStatus.PENDING,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      paymentMethod: input.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount,
      totalCost,
      notes: input.notes ?? "",
      items: { create: items },
    },
  });

  return { ok: true, message: "تم إنشاء الطلب", orderId: order.id, orderNo };
}

export async function confirmOrder(orderId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!existing) return { ok: false, message: "الطلب غير موجود" };
  if (existing.status !== OrderStatus.PENDING) {
    return { ok: false, message: "لا يمكن تأكيد طلب ليس بانتظار التأكيد" };
  }

  const invoiceNo = nextInvoiceNo(await bumpCounter("INV_COUNTER"));

  try {
    await confirmOrderAtomic(orderId, invoiceNo);
  } catch (error) {
    if (error instanceof ConfirmError) return { ok: false, message: error.message };
    return { ok: false, message: "فشل إصدار الفاتورة — حاول مجددًا" };
  }

  revalidateTag(CATALOG_TAG, { expire: 0 });
  triggerSheetsSync();
  return { ok: true, message: "تم تأكيد الطلب وخصم المخزون وإصدار الفاتورة" };
}

class ConfirmError extends Error {}

async function confirmOrderAtomic(orderId: string, invoiceNo: string): Promise<void> {
  let attempt = 0;
  for (;;) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: { include: { variants: true } } } } },
          });
          if (!order) throw new ConfirmError("الطلب غير موجود");
          if (order.status !== OrderStatus.PENDING) {
            throw new ConfirmError("لا يمكن تأكيد طلب ليس بانتظار التأكيد");
          }

          const wanted = new Map<string, number>();
          const variantIndex = new Map<string, Variant>();
          const productName = new Map<string, string>();
          const productIds = new Set<string>();

          for (const item of order.items) {
            const p = item.product;
            productName.set(p.id, p.name);
            productIds.add(p.id);
            if (p.stockPolicy === StockPolicy.MADE_TO_ORDER) continue;
            for (const v of p.variants) variantIndex.set(`${v.productId}|${v.size}|${v.color}`, v);
            const key = `${item.productId}|${item.size}|${item.color}`;
            wanted.set(key, (wanted.get(key) ?? 0) + item.quantity);
          }

          if (wanted.size > 0) {
            const aggs = await tx.orderItem.groupBy({
              by: ["productId", "size", "color"],
              where: {
                order: { status: { in: SOLD } },
                productId: { in: [...productIds] },
              },
              _sum: { quantity: true },
            });
            const confirmed = new Map<string, number>();
            for (const agg of aggs) {
              const key = `${agg.productId}|${agg.size}|${agg.color}`;
              confirmed.set(key, (confirmed.get(key) ?? 0) + (agg._sum.quantity ?? 0));
            }
            for (const [key, qty] of wanted) {
              const v = variantIndex.get(key);
              if (!v) throw new ConfirmError("مقاس أو لون لم يعد موجودًا في هذا المنتج");
              const have = v.stockQty - (confirmed.get(key) ?? 0);
              if (have < qty) {
                throw new ConfirmError(
                  `المخزون لا يكفي: ${productName.get(v.productId) ?? ""} (${v.size}/${v.color}) — المتاح ${Math.max(0, have)}`
                );
              }
            }
          }

          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
          });
          await tx.invoice.create({
            data: { invoiceNo, orderId, amount: order.totalAmount },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 3000,
          timeout: 8000,
        }
      );
      return;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const isSerialization = code === "P2034" || code === "40P01" || code === "40001";
      if (isSerialization && attempt < 3) {
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

export async function cancelOrder(orderId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: "الطلب غير موجود" };
  if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
    return { ok: false, message: "لا يمكن إلغاء طلب مغلق أو ملغى" };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.REFUNDED },
  });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  triggerSheetsSync();
  return { ok: true, message: "تم الإلغاء — عاد المخزون للمصدر وانسحبت المبيعات" };
}

const STATE_FLOW: Record<string, OrderStatus[]> = {
  markPaid: [OrderStatus.CONFIRMED, OrderStatus.PAID],
  markShipped: [OrderStatus.PAID, OrderStatus.SHIPPED],
  markDelivered: [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
};

export async function advanceOrderState(
  orderId: string,
  action: "markPaid" | "markShipped" | "markDelivered"
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: "الطلب غير موجود" };
  const allowed = STATE_FLOW[action];
  if (!allowed) return { ok: false, message: "إجراء غير معروف" };
  if (!allowed.includes(order.status)) {
    return { ok: false, message: "خطوة الحالة غير صحيحة" };
  }
  const next =
    action === "markPaid"
      ? OrderStatus.PAID
      : action === "markShipped"
        ? OrderStatus.SHIPPED
        : OrderStatus.DELIVERED;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: next,
      paymentStatus: action === "markPaid" ? PaymentStatus.PAID : order.paymentStatus,
    },
  });
  triggerSheetsSync();
  return { ok: true, message: "تم تحديث حالة الطلب" };
}

export interface SiteOrderInput {
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  lines: BuyLine[];
}

export async function createSiteOrder(input: SiteOrderInput): Promise<{
  ok: boolean;
  message: string;
  orderNo?: string;
  whatsappUrl?: string;
}> {
  if (!input.customerName.trim() || input.customerName.trim().length > 60) {
    return { ok: false, message: "أدخل اسم الزبون بحرف كحد أقصى 60" };
  }
  const phone = input.customerPhone.trim().replace(/\s+/g, "");
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    return { ok: false, message: "رقم الجوال غير صحيح" };
  }
  if (input.notes && input.notes.length > 500) {
    return { ok: false, message: "الملاحظات طويلة جدًا" };
  }
  const lines = input.lines;
  if (lines.length === 0) return { ok: false, message: "لا توجد أصناف في الطلب" };
  if (lines.length > 12) return { ok: false, message: "عدد الأصناف كبير جدًا — قسّم طلبك" };
  for (const line of lines) {
    if (!line.productId || line.productId.length > 64) {
      return { ok: false, message: "أحد الأصناف غير صحيح" };
    }
    if (!line.size?.trim() || line.size.trim().length > 30) {
      return { ok: false, message: "أحد المقاسات غير صحيح" };
    }
    if (line.color?.length > 30) {
      return { ok: false, message: "أحد الألوان غير صحيح" };
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      return { ok: false, message: "أحد الخانات بكمية غير صحيحة" };
    }
    if (line.printDetails && line.printDetails.length > 300) {
      return { ok: false, message: "تفاصيل الطباعة طويلة جدًا" };
    }
  }
  if (rateLimitHit(`order:${phone}`, SITE_ORDER_LIMIT)) {
    return { ok: false, message: "طلبات كثيرة خلال فترة قصيرة — أعد المحاولة بعد قليل" };
  }

  const created = await createOrderRecord({
    source: OrderSource.SITE,
    ...input,
    customerPhone: phone,
  });
  if (!created.ok || !created.orderId) {
    return { ok: false, message: created.message };
  }

  const order = await prisma.order.findUnique({
    where: { id: created.orderId },
    include: { items: { include: { product: { select: { name: true, sku: true, stockPolicy: true } } } } },
  });
  const messageLines =
    order?.items.map((it) => ({
      name: it.product.name,
      sku: it.product.sku,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      printDetails: it.printDetails,
    })) ?? [];
  const hasMadeToOrder = order?.items.some((it) => it.product.stockPolicy === StockPolicy.MADE_TO_ORDER) ?? false;

  const { buildOrderMessage, buildWhatsAppLink } = await import("./whatsapp");
  const settings = await getSettings();
  const text = buildOrderMessage(
    { ...settings },
    messageLines,
    { customerName: input.customerName || undefined, notes: input.notes || undefined, hasMadeToOrder }
  );

  const link = buildWhatsAppLink(settings.whatsappNumber, text);
  if (!settings.whatsappNumber.trim()) {
    return {
      ok: true,
      message: "الطلب سُجل برقم " + created.orderNo,
      orderNo: created.orderNo,
    };
  }

  return { ok: true, message: "جاري فتح الواتساب", orderNo: created.orderNo, whatsappUrl: link ?? undefined };
}