import { describe, expect, it, vi, beforeEach } from "vitest";
import { OrderSource, PaymentMethod, StockPolicy } from "@prisma/client";
import type { CreateOrderInput, BuyLine } from "../orders/create";

const PRODUCT = {
  id: "p1",
  name: "هودي",
  basePrice: 250,
  costPrice: 120,
  active: true,
  stockPolicy: StockPolicy.STOCKED as StockPolicy,
  variants: [
    { id: "v1", productId: "p1", size: "L", color: "أسود", stockQty: 5 },
    { id: "v2", productId: "p1", size: "XL", color: "أبيض", stockQty: 3 },
  ],
};

interface CreatedItem {
  productId: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  printDetails: string;
}

const created: CreatedItem[] = [];

const orderCreate = vi.fn(async (args: { data: { items: { create: CreatedItem[] } } }) => {
  created.length = 0;
  created.push(...args.data.items.create);
  return { id: "o1", orderNo: "ORD-7" };
});

vi.mock("../prisma", () => ({
  prisma: {
    product: { findMany: vi.fn(async () => [PRODUCT]) },
    order: { create: orderCreate },
    setting: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

const settings = { deliveryFee: 0, currency: "USD" };
vi.mock("../settings", () => ({
  getSettings: vi.fn(async () => settings),
  bumpCounter: vi.fn(async () => 7),
}));

vi.mock("../order-keys", () => ({ nextOrderNo: (n: number) => `ORD-${n}` }));

const line = (size: string, color: string): BuyLine => ({
  productId: "p1",
  size,
  color,
  quantity: 1,
});

const input = (lines: BuyLine[]): CreateOrderInput => ({
  source: OrderSource.SITE,
  paymentMethod: PaymentMethod.COD,
  customerName: "زبون",
  customerPhone: "01000000000",
  lines,
});

describe("createOrderRecord — التحقق من المقاس واللون", () => {
  beforeEach(() => {
    orderCreate.mockClear();
  });

  it("يقبل مقاسًا ولونًا موجودين", async () => {
    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("L", "أسود")]));

    expect(res.ok).toBe(true);
    expect(orderCreate).toHaveBeenCalledTimes(1);
  });

  it("يرفض مقاسًا غير موجود قبل إنشاء الطلب", async () => {
    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("XXXL", "أسود")]));

    expect(res).toEqual({ ok: false, message: "مقاس أو لون غير موجود في المنتج" });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("يرفض لونًا غير موجود", async () => {
    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("L", "وردي")]));

    expect(res.ok).toBe(false);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("يقبل مقاسًا موجودًا بلون آخر ولا يخلط بينهما", async () => {
    const { createOrderRecord } = await import("../orders/create");
    const wrongPair = await createOrderRecord(input([line("L", "أبيض")]));
    const rightPair = await createOrderRecord(input([line("XL", "أبيض")]));

    expect(wrongPair.ok).toBe(false);
    expect(rightPair.ok).toBe(true);
  });

  it("يتجاهل الفراغات حول المقاس واللون", async () => {
    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("  L  ", " أسود ")]));

    expect(res.ok).toBe(true);
  });

  it("يخزّن المقاس واللون مقصوصين", async () => {
    const { createOrderRecord } = await import("../orders/create");
    await createOrderRecord(input([line("  L  ", " أسود ")]));

    expect(created).toEqual([
      {
        productId: "p1",
        size: "L",
        color: "أسود",
        quantity: 1,
        unitPrice: 250,
        unitCost: 120,
        printDetails: "",
      },
    ]);
  });

  it("يرفض منتجًا غير مفعّل", async () => {
    PRODUCT.active = false;
    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("L", "أسود")]));

    expect(res).toEqual({ ok: false, message: "منتج غير متاح للطلب" });
    PRODUCT.active = true;
  });

  it("يقبل أي مقاس ولون لمنتج يُصنع عند الطلب بلا متغيرات", async () => {
    const original = { stockPolicy: PRODUCT.stockPolicy, variants: PRODUCT.variants };
    PRODUCT.stockPolicy = StockPolicy.MADE_TO_ORDER;
    PRODUCT.variants = [];

    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("مقاس خاص", "لون خاص")]));

    expect(res.ok).toBe(true);
    expect(created[0]).toMatchObject({ size: "مقاس خاص", color: "لون خاص" });

    PRODUCT.stockPolicy = original.stockPolicy;
    PRODUCT.variants = original.variants;
  });

  it("يرفض مقاسًا أو لونًا فارغًا حتى مع الصنع عند الطلب", async () => {
    const original = { stockPolicy: PRODUCT.stockPolicy, variants: PRODUCT.variants };
    PRODUCT.stockPolicy = StockPolicy.MADE_TO_ORDER;
    PRODUCT.variants = [];

    const { createOrderRecord } = await import("../orders/create");
    const res = await createOrderRecord(input([line("  ", "أسود")]));

    expect(res).toEqual({ ok: false, message: "أدخل المقاس واللون" });
    expect(orderCreate).not.toHaveBeenCalled();

    PRODUCT.stockPolicy = original.stockPolicy;
    PRODUCT.variants = original.variants;
  });
});