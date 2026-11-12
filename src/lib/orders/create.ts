import { OrderSource, OrderStatus, PaymentMethod, PaymentStatus, StockPolicy } from "@prisma/client";
import { prisma } from "../prisma";
import { orderTotal, orderCost, variantKey } from "../inventory";
import { getSettings, bumpCounter } from "../settings";
import { nextOrderNo } from "../order-keys";

export interface BuyLine {
  productId: string;
  size: string;
  color: string;
  quantity: number;
  printDetails?: string;
}

export interface CreateOrderInput {
  source: OrderSource;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  lines: BuyLine[];
}

export interface CreateOrderResult {
  ok: boolean;
  message: string;
  orderId?: string;
  orderNo?: string;
}

export interface OrderItemInput {
  productId: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  printDetails: string;
}

interface BuildItemsResult {
  ok: boolean;
  message?: string;
  items?: OrderItemInput[];
}

export async function buildOrderItems(lines: BuyLine[]): Promise<BuildItemsResult> {
  const cleanLines = lines.filter((l) => l.quantity > 0);
  if (cleanLines.length === 0) {
    return { ok: false, message: "لا توجد أصناف في الطلب" };
  }

  const productIds = [...new Set(cleanLines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantKeys = new Map(
    products.map((p) => [p.id, new Set(p.variants.map((v) => variantKey(p.id, v.size, v.color)))])
  );

  const items: OrderItemInput[] = [];
  for (const line of cleanLines) {
    const product = productMap.get(line.productId);
    if (!product) return { ok: false, message: "منتج غير موجود" };
    if (!product.active) return { ok: false, message: "منتج غير متاح للطلب" };

    const size = line.size.trim();
    const color = line.color.trim();
    if (!size || !color) {
      return { ok: false, message: "أدخل المقاس واللون" };
    }

    // الطلب يخزّن المقاس واللون كنص لا كـ variantId (انظر PLAN.md)، فبلا هذا
    // الفحص يمكن لطلب مُنشأ أن يحمل مقاسًا غير موجود إطلاقًا — فيُحفظ ثم يرفضه
    // التأكيد لاحقًا، أي طلب غير قابل للتأكيد أبدًا. نتحقق الآن عند الدخول.
    // منتج «صنع عند الطلب» قد لا يملك متغيرات أصلًا، فيُقبل أي زوج غير فارغ.
    if (
      product.stockPolicy !== StockPolicy.MADE_TO_ORDER &&
      !variantKeys.get(product.id)?.has(variantKey(product.id, size, color))
    ) {
      return { ok: false, message: "مقاس أو لون غير موجود في المنتج" };
    }

    items.push({
      productId: product.id,
      size,
      color,
      quantity: line.quantity,
      unitPrice: product.basePrice,
      unitCost: product.costPrice,
      printDetails: line.printDetails ?? "",
    });
  }

  return { ok: true, items };
}

export async function createOrderRecord(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.customerName.trim()) {
    return { ok: false, message: "أدخل اسم الزبون" };
  }

  const built = await buildOrderItems(input.lines);
  if (!built.ok || !built.items) {
    return { ok: false, message: built.message ?? "لا توجد أصناف في الطلب" };
  }
  const items = built.items;

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