"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/lib/admin-actions";
import type { ProductInput, VariantInput } from "@/lib/admin-actions";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageManager } from "./image-manager";
import { STOCK_POLICY_LABEL } from "@/lib/labels";

interface Props {
  product?: {
    id: string;
    name: string;
    description: string;
    category: string;
    stockPolicy: string;
    basePrice: number;
    costPrice: number;
    designName: string;
    printDetails: string;
    leadTimeDays: number;
    images: string[];
    active: boolean;
    featured: boolean;
    variants: { size: string; color: string; stockQty: number }[];
  };
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "HOODIE");
  const [stockPolicy, setStockPolicy] = useState(product?.stockPolicy ?? "STOCKED");
  const [basePrice, setBasePrice] = useState(String(product?.basePrice ?? 0));
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? 0));
  const [designName, setDesignName] = useState(product?.designName ?? "");
  const [printDetails, setPrintDetails] = useState(product?.printDetails ?? "");
  const [leadTimeDays, setLeadTimeDays] = useState(product?.leadTimeDays?.toString() ?? "3");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [variants, setVariants] = useState<VariantInput[]>(
    product?.variants ?? [{ size: "", color: "", stockQty: 0 }]
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function updateVariant(i: number, patch: Partial<VariantInput>) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const input: ProductInput = {
      id: product?.id,
      name,
      description,
      category: category as "HOODIE" | "TSHIRT",
      stockPolicy: stockPolicy as "STOCKED" | "MADE_TO_ORDER",
      basePrice: Number(basePrice) || 0,
      costPrice: Number(costPrice) || 0,
      designName,
      printDetails,
      leadTimeDays: Number(leadTimeDays) || 3,
      images,
      active,
      featured,
      variants,
    };
    const res = await saveProduct(input);
    setBusy(false);
    setMessage({ type: res.ok ? "ok" : "err", text: res.message });
    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="اسم المنتج">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="مثل: كنزة EGO رسمية أوفرسايز" />
        </Field>
        <Field label="اسم التصميم (اختياري)">
          <Input value={designName} onChange={(e) => setDesignName(e.target.value)} placeholder="اسم الطبعة إن وجدت" />
        </Field>
        <Field label="الفئة">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="HOODIE">هودي</option>
            <option value="TSHIRT">تيشيرت</option>
          </Select>
        </Field>
        <Field label="سياسة الكمية">
          <Select value={stockPolicy} onChange={(e) => setStockPolicy(e.target.value)}>
            {(Object.keys(STOCK_POLICY_LABEL) as (keyof typeof STOCK_POLICY_LABEL)[]).map((k) => (
              <option key={k} value={k}>{STOCK_POLICY_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
        <Field label="سعر البيع" hint="بالعملة المحددة في الإعدادات">
          <Input type="number" min={0} step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
        </Field>
        <Field label="سعر التكلفة" hint="أساس حساب الأرباح">
          <Input type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
        </Field>
        {stockPolicy === "MADE_TO_ORDER" ? (
          <Field label="مدة التجهيز (أيام)">
            <Input type="number" min={1} value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
          </Field>
        ) : null}
      </div>

      <Field label="الوصف">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف القطعة..." />
      </Field>

      <Field label="تفاصيل الطباعة" hint="مكان الطباعة وأسلوبها — يُعرض في صفة المنتج">
        <Textarea value={printDetails} onChange={(e) => setPrintDetails(e.target.value)} placeholder="مثل: طباعة أمامية/خلفية بحجم كبير" />
      </Field>

      <Field label="الصور">
        <ImageManager value={images} onChange={setImages} />
      </Field>

      {stockPolicy === "STOCKED" ? (
        <Field label="المقاسات والألوان والمخزون" hint="لكل تركيبة مقاس×لون كمية مستقلة">
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <Input placeholder="مقاس (M)" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                <Input placeholder="لون (أسود)" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} />
                <Input type="number" min={0} placeholder="الكمية" value={v.stockQty} onChange={(e) => updateVariant(i, { stockQty: Number(e.target.value) || 0 })} />
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={variants.length === 1}
                >
                  حذف
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVariants((prev) => [...prev, { size: "", color: "", stockQty: 0 }])}
            >
              + إضافة مقاس/لون
            </Button>
          </div>
        </Field>
      ) : (
        <Field label="المقاسات والألوان المتاحة" hint="لصنع عند الطلب: بدون كميات — تُسجل خيارات الزبون فقط">
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Input placeholder="مقاس (M)" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                <Input placeholder="لون (أسود)" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setVariants((prev) => [...prev, { size: "", color: "", stockQty: 0 }])}>
              + إضافة مقاس/لون
            </Button>
          </div>
        </Field>
      )}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          ظاهر في الموقع
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          مميز في الرئيسية
        </label>
      </div>

      {message ? (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "جاري الحفظ..." : product ? "حفظ التعديلات" : "إنشاء المنتج"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}