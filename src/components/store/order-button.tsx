"use client";

import { useState } from "react";
import type { VariantWithBalance } from "@/lib/catalog";
import type { AppSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { createSiteOrder } from "@/lib/order-actions";
import { Button, Input, Textarea, inputClass } from "@/components/ui";

interface Props {
  productId: string;
  sku: string;
  basePrice: number;
  stockPolicy: "STOCKED" | "MADE_TO_ORDER";
  variants: VariantWithBalance[];
  settings: AppSettings;
  soldOut: boolean;
  printDesignName?: string;
}

const STEPS = ["القطعة", "معلوماتك", "التأكيد"];

export function OrderButton({
  productId,
  sku,
  basePrice,
  stockPolicy,
  variants,
  settings,
  soldOut,
  printDesignName,
}: Props) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [manualSize, setManualSize] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [printDetails, setPrintDetails] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"SHAM_CASH" | "COD">("SHAM_CASH");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const sizes = [...new Set(variants.map((v) => v.size))];
  const hasVariants = variants.length > 0;

  const finalSize = (hasVariants ? size : manualSize).trim();
  const finalColor = (hasVariants ? color : manualColor).trim();

  const lineTotal = basePrice * quantity;
  const deliveryFee = settings.deliveryFee > 0 ? settings.deliveryFee : 0;
  const total = lineTotal + deliveryFee;

  function fail(text: string) {
    setMessage({ type: "err", text });
  }

  function validateStep(stepNo: number): boolean {
    setMessage(null);
    if (stepNo === 1) {
      if (!finalSize) {
        fail(hasVariants ? "اختر المقاس أولًا" : "أدخل المقاس أولًا");
        return false;
      }
      if (!finalColor) {
        fail(hasVariants ? "اختر اللون أولًا" : "أدخل اللون أولًا");
        return false;
      }
      return true;
    }
    if (stepNo === 2) {
      if (!customerName.trim()) {
        fail("أدخل اسمك ليبقى الطلب مسجلًا باسمك");
        return false;
      }
      const phone = customerPhone.trim().replace(/\s+/g, "");
      if (!/^\+?[0-9]{8,15}$/.test(phone)) {
        fail("أدخل رقم جوال صحيح لنتواصل معك بشأن الطلب");
        return false;
      }
      return true;
    }
    return true;
  }

  function next() {
    if (validateStep(step) && step < 3) {
      setStep((v) => v + 1);
    }
  }

  async function submit() {
    if (!validateStep(3)) return;
    setBusy(true);
    setMessage(null);
    const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
    const res = await createSiteOrder({
      customerName,
      customerPhone,
      paymentMethod,
      notes: printDetails.trim() ? `تفاصيل الطباعة: ${printDetails.trim()}` : "",
      lines: [
        {
          productId,
          size: finalSize,
          color: finalColor,
          quantity,
          printDetails: printDetails.trim() || undefined,
        },
      ],
    });
    setBusy(false);
    if (!res.ok) {
      win?.close();
      setMessage({ type: "err", text: res.message });
      return;
    }
    setMessage({ type: "ok", text: `الطلب سُجل برقم ${res.orderNo}` });
    if (res.whatsappUrl) {
      if (win) {
        win.opener = null;
        win.location.href = res.whatsappUrl;
      } else {
        window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      win?.close();
    }
  }

  if (soldOut) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
        <p className="text-lg font-black text-zinc-400">نفدت الكمية</p>
        <p className="mt-1 text-sm text-zinc-500">نفدت هذه القطعة — تابعنا للكمية الجديدة</p>
      </div>
    );
  }

  const stepRowClass = (s: number) =>
    `flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
      step === s
        ? "bg-primary text-white"
        : step > s
          ? "bg-primary-soft text-primary-strong"
          : "bg-zinc-100 text-zinc-500"
    }`;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-zinc-900">
            {money(basePrice, settings.currency, settings.currencyPosition)}
          </p>
          {stockPolicy === "MADE_TO_ORDER" ? (
            <p className="mt-0.5 text-xs font-bold text-primary-strong">
              طباعة عند الطلب — مدة التجهيز {settings.defaultLeadTime}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-primary-soft px-4 py-2 text-left">
          <p className="text-[11px] font-semibold text-zinc-500">الإجمالي</p>
          <p className="text-sm font-black text-primary-strong">
            {money(total, settings.currency, settings.currencyPosition)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {STEPS.map((label, i) => {
          const s = i + 1;
          return (
            <span key={label} className={stepRowClass(s)}>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[11px] font-black">
                {s}
              </span>
              {label}
            </span>
          );
        })}
      </div>

      {printDesignName ? (
        <p className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          <span className="font-bold text-primary-strong">تصميم:</span> {printDesignName}
        </p>
      ) : null}
      {step === 1 ? (
        <div className="space-y-4">
          {hasVariants ? (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold text-zinc-700">
                  المقاس {size ? <span className="font-black">: {size}</span> : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const allColorsForSizeSoldOut = variants
                      .filter((v) => v.size === s)
                      .every((v) => v.soldOut);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={allColorsForSizeSoldOut}
                        onClick={() => setSize(s)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          size === s
                            ? "border-primary bg-primary text-white"
                            : "border-zinc-300 bg-white text-zinc-700 hover:border-primary"
                        }`}
                      >
                        {s}
                        {allColorsForSizeSoldOut ? (
                          <span className="text-[11px] font-black text-rose-500"> نفد</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {size ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-700">
                    اللون {color ? <span className="font-black">: {color}</span> : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants
                      .filter((v) => v.size === size)
                      .map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          disabled={v.soldOut}
                          onClick={() => setColor(v.color)}
                          title={v.soldOut ? "نفدت الكمية" : undefined}
                          className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            color === v.color
                              ? "border-primary bg-primary text-white"
                              : "border-zinc-300 bg-white text-zinc-700 hover:border-primary"
                          }`}
                        >
                          {v.color}
                          {v.soldOut ? (
                            <span className="mr-1 text-[11px] font-black text-rose-500">نفد</span>
                          ) : (
                            <span className="mr-1 text-[11px] font-semibold text-zinc-400">
                              متوفر {v.remaining}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">المقاس</label>
                <Input value={manualSize} onChange={(e) => setManualSize(e.target.value)} placeholder="مثل: L" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">اللون</label>
                <Input value={manualColor} onChange={(e) => setManualColor(e.target.value)} placeholder="مثل: أسود" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">الكمية</label>
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  setQuantity(Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(99, parsed)));
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">
              تفاصيل الطباعة / ملاحظات (اختياري)
            </label>
            <Textarea
              value={printDetails}
              onChange={(e) => setPrintDetails(e.target.value)}
              placeholder="مثل: طباعة بسم الله على الظهر بحجم كبير"
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">اسمك</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">رقم الجوال</label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-zinc-400">ضروري ليتواصل معك البائع بشأن الطلب</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-700">طريقة الدفع</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("SHAM_CASH")}
                className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                  paymentMethod === "SHAM_CASH"
                    ? "border-primary bg-primary text-white"
                    : "border-zinc-300 text-zinc-700"
                }`}
              >
                تحويل شام كاش{settings.shamCashNumber ? ` (${settings.shamCashNumber})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("COD")}
                className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                  paymentMethod === "COD" ? "border-primary bg-primary text-white" : "border-zinc-300 text-zinc-700"
                }`}
              >
                عند الاستلام
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm">
          <p className="flex justify-between gap-2">
            <span className="text-zinc-500">القطعة:</span>
            <span className="font-bold text-zinc-900">{sku} — مقاس {finalSize} — لون {finalColor}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-zinc-500">الكمية:</span>
            <span className="font-bold text-zinc-900">{quantity}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-zinc-500">المجموع:</span>
            <span className="font-bold text-zinc-900">{money(lineTotal, settings.currency, settings.currencyPosition)}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-zinc-500">التوصيل:</span>
            <span className="font-bold text-zinc-900">
              {deliveryFee > 0 ? money(deliveryFee, settings.currency, settings.currencyPosition) : "يُتفق حسب المنطقة"}
            </span>
          </p>
          <p className="flex justify-between gap-2 border-t border-zinc-200 pt-2 text-base">
            <span className="font-bold text-zinc-900">الإجمالي:</span>
            <span className="font-black text-primary-strong">{money(total, settings.currency, settings.currencyPosition)}</span>
          </p>
          <p className="pt-1 text-xs text-zinc-500">
            الاسم: {customerName} — الدفع:{" "}
            {paymentMethod === "SHAM_CASH" ? "شام كاش" : "عند الاستلام"}
          </p>
          {printDetails.trim() ? (
            <p className="text-xs text-zinc-500">
              <span className="font-bold">الطباعة:</span> {printDetails.trim()}
            </p>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
            message.type === "ok" ? "bg-primary-soft text-primary-strong" : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex gap-2">
        {step > 1 ? (
          <Button variant="secondary" className="flex-1" onClick={() => setStep((v) => v - 1)} disabled={busy}>
            رجوع
          </Button>
        ) : null}
        {step < 3 ? (
          <Button variant="primary" className="flex-1" onClick={next} disabled={busy}>
            التالي
          </Button>
        ) : (
          <Button
            variant="whatsapp"
            size="lg"
            className="flex-1"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "جاري تجهيز الطلب..." : "أرسل الطلب عبر واتساب"}
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-zinc-500">
        سجّلنا طلبك برقم مرجع وفتحنا لك واتساب لإرسال التفاصيل للمتجر
      </p>
    </div>
  );
}