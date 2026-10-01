"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmOrder, cancelOrder, advanceOrderState } from "@/lib/order-actions";
import { Button } from "@/components/ui";

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function run(action: () => Promise<{ ok: boolean; message: string }>, key: string) {
    setBusy(key);
    setMessage(null);
    const res = await action();
    setMessage({ type: res.ok ? "ok" : "err", text: res.message });
    setBusy(null);
    router.refresh();
  }

  const confirmDisabled = status !== "PENDING";
  const revertible = ["PENDING", "CONFIRMED", "PAID", "SHIPPED"].includes(status);

  return (
    <div className="space-y-3">
      {!confirmDisabled ? (
        <Button
          variant="success"
          className="w-full"
          disabled={busy !== null}
          onClick={() => run(() => confirmOrder(orderId), "confirm")}
        >
          {busy === "confirm" ? "جاري تأكيد الطلب..." : "تأكيد الطلب — خصم المخزون وإصدار الفاتورة"}
        </Button>
      ) : null}
      {status === "CONFIRMED" ? (
        <Button
          variant="primary"
          className="w-full"
          disabled={busy !== null}
          onClick={() => run(() => advanceOrderState(orderId, "markPaid"), "paid")}
        >
          تم استلام الدفع
        </Button>
      ) : null}
      {status === "PAID" ? (
        <Button
          variant="primary"
          className="w-full"
          disabled={busy !== null}
          onClick={() => run(() => advanceOrderState(orderId, "markShipped"), "shipped")}
        >
          تم الشحن / بالتسليم
        </Button>
      ) : null}
      {status === "SHIPPED" ? (
        <Button
          variant="success"
          className="w-full"
          disabled={busy !== null}
          onClick={() => run(() => advanceOrderState(orderId, "markDelivered"), "delivered")}
        >
          تم التسليم — إغلاق الطلب
        </Button>
      ) : null}
      {revertible ? (
        <Button
          variant="danger"
          className="w-full"
          disabled={busy !== null}
          onClick={async () => {
            if (confirm("تأكيد إلغاء الطلب؟ سيعود المخزون وتُسحب المبيعات والأرباح.")) {
              await run(() => cancelOrder(orderId), "cancel");
            }
          }}
        >
          {busy === "cancel" ? "جاري الإلغاء..." : "إلغاء الطلب"}
        </Button>
      ) : null}
      {message ? (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message.text}
        </p>
      ) : null}
      {confirmDisabled && status !== "CANCELLED" ? (
        <p className="text-center text-xs text-zinc-400">الطلب {status === "CONFIRMED" ? "مؤكد — لا يمكن إعادة التأكيد" : "في مرحلة تالية"}</p>
      ) : null}
    </div>
  );
}