"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderSource } from "@prisma/client";
import type { ProductWithBalance } from "@/lib/catalog";
import type { AppSettings } from "@/lib/settings";
import { createOrderRecord } from "@/lib/order-actions";
import { money } from "@/lib/format";
import { Button, Field, Input, Textarea } from "@/components/ui";

interface Line {
  product: ProductWithBalance;
  size: string;
  color: string;
  quantity: number;
  printDetails: string;
}

export function OrderForm({ products, settings }: { products: ProductWithBalance[]; settings: AppSettings }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"SHAM_CASH" | "COD">("SHAM_CASH");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const searchLower = search.trim().toLowerCase();
  const suggestions = searchLower
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          p.designName.toLowerCase().includes(searchLower)
      )
    : [];

  function addLine(product: ProductWithBalance) {
    const firstVariant = product.variants[0];
    setLines((prev) => [
      ...prev,
      {
        product,
        size: firstVariant?.size ?? "",
        color: firstVariant?.color ?? "",
        quantity: 1,
        printDetails: "",
      },
    ]);
    setSearch("");
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function total() {
    return lines.reduce((s, l) => s + l.product.basePrice * l.quantity, 0) + settings.deliveryFee;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (lines.length === 0) {
      setMessage({ type: "err", text: "أضف منتجًا واحدًا على الأقل" });
      return;
    }
    setBusy(true);
    const res = await createOrderRecord({
      source: OrderSource.WHATSAPP,
      customerName,
      customerPhone,
      paymentMethod,
      notes,
      lines: lines.map((l) => ({
        productId: l.product.id,
        size: l.size,
        color: l.color,
        quantity: l.quantity,
        printDetails: l.printDetails || undefined,
      })),
    });
    setBusy(false);
    setMessage({ type: res.ok ? "ok" : "err", text: res.message });
    if (res.ok) {
      setLines([]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      router.refresh();
    }
  }

  const selectedVariantCount = lines.filter((l) => l.product.stockPolicy === "STOCKED").length;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="اسم الزبون">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="من المحادثة" required />
        </Field>
        <Field label="رقم الهاتف (اختياري)">
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="09xxxxxxxx" />
        </Field>
      </div>

      <Field label="طريقة الدفع">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("SHAM_CASH")}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
              paymentMethod === "SHAM_CASH" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"
            }`}
          >
            شام كاش{settings.shamCashNumber ? ` (${settings.shamCashNumber})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("COD")}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
              paymentMethod === "COD" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"
            }`}
          >
            عند الاستلام
          </button>
        </div>
      </Field>

      <Field label="إضافة قطعة (ابحث بالرمز أو الاسم)">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="مثل: EGO-001 أو كنزة"
          autoComplete="off"
        />
        {suggestions.length > 0 ? (
          <ul className="z-10 mt-2 max-h-64 divide-y divide-zinc-100 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addLine(p)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-right hover:bg-zinc-50"
                >
                  {p.mainImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mainImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-100 text-xs font-black text-zinc-400">
                      {p.sku}
                    </span>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-zinc-400">{p.sku} — {p.designName || "بدون تصميم"}</p>
                  </div>
                  <span className="text-sm font-bold">{money(p.basePrice, settings.currency, settings.currencyPosition)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Field>

      {lines.length > 0 ? (
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black">{l.product.sku}</span>
                  <span className="font-bold">{l.product.name}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}>
                  إزالة
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {l.product.variants.length > 0 ? (
                  <>
                    <select
                      className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                      value={l.size}
                      onChange={(e) => updateLine(i, { size: e.target.value })}
                      disabled={l.product.stockPolicy === "STOCKED" ? !selectedVariantCount : false}
                    >
                      <option value="">مقاس...</option>
                      {[...new Set(l.product.variants.map((v) => v.size))].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                      value={l.color}
                      onChange={(e) => updateLine(i, { color: e.target.value })}
                    >
                      <option value="">لون...</option>
                      {[...new Set(l.product.variants.map((v) => v.color))].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <Input placeholder="مقاس" value={l.size} onChange={(e) => updateLine(i, { size: e.target.value })} />
                    <Input placeholder="لون" value={l.color} onChange={(e) => updateLine(i, { color: e.target.value })} />
                  </>
                )}
                <Input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                />
                <div className="flex items-center justify-center rounded-lg bg-zinc-100 px-2 py-2 text-sm font-bold">
                  {money(l.product.basePrice * l.quantity, settings.currency, settings.currencyPosition)}
                </div>
              </div>
              <Input
                className="mt-2"
                placeholder="تفاصيل الطباعة / ملاحظة على هذه القطعة (اختياري)"
                value={l.printDetails}
                onChange={(e) => updateLine(i, { printDetails: e.target.value })}
              />
            </div>
          ))}
        </div>
      ) : null}

      <Field label="ملاحظات عامة (اختياري)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثل: التوصيل إلى دمشق..." />
      </Field>

      <div className="flex items-center justify-between rounded-xl bg-zinc-900 p-4 text-white">
        <span className="font-bold">
          الإجمالي ({lines.reduce((s, l) => s + l.quantity, 0)} قطعة)
          {settings.deliveryFee > 0 ? ` + توصيل ${settings.deliveryFee}${settings.currency}` : ""}
        </span>
        <span className="text-xl font-black">
          {money(total(), settings.currency, settings.currencyPosition)}
        </span>
      </div>

      {message ? (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "جاري الإنشاء..." : "إنشاء الطلب (بانتظار التأكيد)"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/orders")}>
          رجوع للقائمة
        </Button>
      </div>
    </form>
  );
}