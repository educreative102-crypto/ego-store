import { describe, expect, it, vi, beforeEach } from "vitest";
import { OrderStatus, PaymentStatus } from "@prisma/client";

interface StateWrite {
  where: { id: string; status: { in: OrderStatus[] }; paymentStatus: PaymentStatus };
  data: { status: OrderStatus; paymentStatus: PaymentStatus; confirmedAt?: Date | null };
}

const findUnique = vi.fn<(args: unknown) => Promise<unknown>>(async () => null);
const updateMany = vi.fn<(args: StateWrite) => Promise<{ count: number }>>(async () => ({ count: 1 }));
const orderUpdate = vi.fn<(args: unknown) => Promise<object>>(async () => ({}));

vi.mock("../prisma", () => ({
  prisma: {
    order: { findUnique, updateMany, update: orderUpdate },
  },
}));

vi.mock("../auth", () => ({ requireAdmin: vi.fn(async () => {}) }));
vi.mock("../sheets/sync", () => ({ triggerSheetsSync: vi.fn(async () => {}) }));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

// الدفعة غير المدفوعة هي PENDING في المخطط، لا UNPAID.
const order = (
  status: OrderStatus,
  paymentStatus: PaymentStatus = PaymentStatus.PENDING
) => ({
  id: "o1",
  status,
  paymentStatus,
  confirmedAt: null,
});

describe("cancelOrder", () => {
  beforeEach(() => {
    findUnique.mockReset();
    updateMany.mockClear().mockResolvedValue({ count: 1 });
    orderUpdate.mockClear();
  });

  it("يلغي طلبًا مدفوعًا ويكتب مسترد", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PAID, PaymentStatus.PAID));
    const { cancelOrder } = await import("../order-actions");
    const res = await cancelOrder("o1");

    expect(res.ok).toBe(true);
    const call = updateMany.mock.calls[0][0];
    expect(call.data.status).toBe(OrderStatus.CANCELLED);
    expect(call.data.paymentStatus).toBe(PaymentStatus.REFUNDED);
  });

  it("لا يكتب مستردًا لطلب لم يُدفع", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PENDING, PaymentStatus.PENDING));
    const { cancelOrder } = await import("../order-actions");
    const res = await cancelOrder("o1");

    expect(res.ok).toBe(true);
    expect(updateMany.mock.calls[0][0].data.paymentStatus).toBe(PaymentStatus.PENDING);
  });

  it("يمسح تاريخ التأكيد", async () => {
    findUnique.mockResolvedValue({ ...order(OrderStatus.CONFIRMED), confirmedAt: new Date() });
    const { cancelOrder } = await import("../order-actions");
    await cancelOrder("o1");

    expect(updateMany.mock.calls[0][0].data.confirmedAt).toBeNull();
  });

  it("يرفض طلبًا مغلقًا أو ملغى بلا كتابة", async () => {
    for (const status of [OrderStatus.DELIVERED, OrderStatus.CANCELLED]) {
      findUnique.mockResolvedValue(order(status));
      const { cancelOrder } = await import("../order-actions");
      const res = await cancelOrder("o1");

      expect(res.ok).toBe(false);
    }
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("يرفض الكتابة إن تغيّرت الحالة بالتوازي", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.SHIPPED));
    updateMany.mockResolvedValue({ count: 0 });
    const { cancelOrder } = await import("../order-actions");
    const res = await cancelOrder("o1");

    expect(res).toEqual({ ok: false, message: "تغيّرت حالة الطلب — أعد المحاولة" });
  });

  it("يقصر الكتابة على الحالات القابلة للإلغاء", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PENDING));
    const { cancelOrder } = await import("../order-actions");
    await cancelOrder("o1");

    expect(updateMany.mock.calls[0][0].where.status).toEqual({
      in: [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
      ],
    });
  });

  it("لا يستخدم update غير المحمي", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.CONFIRMED));
    const { cancelOrder } = await import("../order-actions");
    await cancelOrder("o1");

    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("يحرس حالة الدفع أيضًا: ماركس الدفع بين القراءة والإلغاء تُرفض الكتابة", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.CONFIRMED, PaymentStatus.PENDING));
    const { cancelOrder } = await import("../order-actions");
    await cancelOrder("o1");

    expect(updateMany.mock.calls[0][0].where.paymentStatus).toBe(PaymentStatus.PENDING);
  });
});

describe("advanceOrderState", () => {
  beforeEach(() => {
    findUnique.mockReset();
    updateMany.mockClear().mockResolvedValue({ count: 1 });
    orderUpdate.mockClear();
  });

  it("markPaid يكتب مدفوع", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.CONFIRMED));
    const { advanceOrderState } = await import("../order-actions");
    const res = await advanceOrderState("o1", "markPaid");

    expect(res.ok).toBe(true);
    const call = updateMany.mock.calls[0][0];
    expect(call.data).toMatchObject({
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID,
    });
  });

  it("markShipped لا يغيّر حالة الدفع", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PAID, PaymentStatus.PAID));
    const { advanceOrderState } = await import("../order-actions");
    await advanceOrderState("o1", "markShipped");

    expect(updateMany.mock.calls[0][0].data.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("markDelivered يُرفض من حالة غير منشورة", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.CONFIRMED));
    const { advanceOrderState } = await import("../order-actions");
    const res = await advanceOrderState("o1", "markDelivered");

    expect(res).toEqual({ ok: false, message: "خطوة الحالة غير صحيحة" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("يرفض الكتابة إن تغيّرت الحالة بالتوازي", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PAID, PaymentStatus.PAID));
    updateMany.mockResolvedValue({ count: 0 });
    const { advanceOrderState } = await import("../order-actions");
    const res = await advanceOrderState("o1", "markShipped");

    expect(res).toEqual({ ok: false, message: "تغيّرت حالة الطلب — أعد المحاولة" });
  });

  it("يقيّد الكتابة بحالات المصدر المسموحة", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.SHIPPED));
    const { advanceOrderState } = await import("../order-actions");
    await advanceOrderState("o1", "markDelivered");

    expect(updateMany.mock.calls[0][0].where.status).toEqual({
      in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
    });
  });

  it("لا يستخدم update غير المحمي", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PAID));
    const { advanceOrderState } = await import("../order-actions");
    await advanceOrderState("o1", "markShipped");

    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("يحرس حالة الدفع حتى لا تُطمس علامة مدفوع سُجّلت بالتوازي", async () => {
    findUnique.mockResolvedValue(order(OrderStatus.PAID, PaymentStatus.PENDING));
    const { advanceOrderState } = await import("../order-actions");
    await advanceOrderState("o1", "markShipped");

    expect(updateMany.mock.calls[0][0].where.paymentStatus).toBe(PaymentStatus.PENDING);
  });
});