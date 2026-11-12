"use server";

import { Category, StockPolicy } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { bumpCounter, setSettingsMany, setAdminPassword } from "./settings";
import { nextSku } from "./order-keys";
import { slugify } from "./slug";
import { forceSyncSheets, triggerSheetsSync } from "./sheets/sync";
import { CATALOG_TAG } from "./catalog";
import { normalizeVariants, safeInt, safeMoney } from "./product-input";
import type { SyncResult } from "./sheets/sync";

export interface VariantInput {
  size: string;
  color: string;
  stockQty: number;
}

export interface ProductInput {
  id?: string;
  name: string;
  description: string;
  category: Category;
  stockPolicy: StockPolicy;
  basePrice: number;
  costPrice: number;
  designName: string;
  printDetails: string;
  leadTimeDays: number;
  images: string[];
  active: boolean;
  featured: boolean;
  variants: VariantInput[];
}

export async function saveProduct(input: ProductInput): Promise<{ ok: boolean; message: string; id?: string }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, message: "أدخل اسم المنتج" };

  // القيمة يجب أن تكون رقمًا منتهٍ: الفحص القديم (>= 0) كان يمرّر Infinity،
  // و (costPrice || 0) كان يقبل السالب لأن 0 هي الوحيدة الفاشية — فالتكلفة
  // السالبة تجعل الربح أكبر من الإيراد في كل تقرير.
  if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
    return { ok: false, message: "سعر البيع غير صحيح" };
  }
  if (!Number.isFinite(input.costPrice) || input.costPrice < 0) {
    return { ok: false, message: "سعر التكلفة غير صحيح" };
  }
  if (!Number.isInteger(input.leadTimeDays) || input.leadTimeDays < 1) {
    return { ok: false, message: "مدة التجهيز يجب أن تكون يومًا واحدًا على الأقل" };
  }

  const cleanVariants = normalizeVariants(input.variants);

  const data = {
    name,
    description: input.description.trim(),
    category: input.category,
    stockPolicy: input.stockPolicy,
    basePrice: input.basePrice,
    costPrice: input.costPrice,
    designName: input.designName.trim(),
    printDetails: input.printDetails.trim(),
    leadTimeDays: input.leadTimeDays,
    images: JSON.stringify(input.images.filter(Boolean)),
    active: input.active,
    featured: input.featured,
  };

  if (input.id) {
    const existing = await prisma.product.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false, message: "المنتج غير موجود" };
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: input.id }, data });
      await tx.variant.deleteMany({ where: { productId: input.id } });
      if (cleanVariants.length > 0) {
        await tx.variant.createMany({
          data: cleanVariants.map((v) => ({
            productId: input.id!,
            size: v.size,
            color: v.color,
            stockQty: v.stockQty,
          })),
        });
      }
    });
    revalidateTag(CATALOG_TAG, { expire: 0 });
    await triggerSheetsSync();
    return { ok: true, message: "تم حفظ المنتج", id: input.id };
  }

  const skuCounter = await bumpCounter("SKU_COUNTER");
  const sku = nextSku("EGO", skuCounter);
  let slug = slugify(name, sku.toLowerCase());
  const slugExists = await prisma.product.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${skuCounter}`;

  const product = await prisma.product.create({
    data: {
      ...data,
      sku,
      slug,
      variants: {
        create: cleanVariants.map((v) => ({
          size: v.size,
          color: v.color,
          stockQty: v.stockQty,
        })),
      },
    },
  });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  await triggerSheetsSync();
  return { ok: true, message: "تم إنشاء المنتج برمز " + sku, id: product.id };
}

export async function toggleProductActive(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { ok: false, message: "المنتج غير موجود" };
  await prisma.product.update({ where: { id }, data: { active: !product.active } });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  await triggerSheetsSync();
  return { ok: true, message: product.active ? "تم تعطيل المنتج (اختفى من الموقع)" : "تم تفعيل المنتج" };
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const count = await prisma.orderItem.count({ where: { productId: id } });
  if (count > 0) {
    return { ok: false, message: "لا يمكن الحذف لوجود طلبات مرتبطة — عطّله بدلًا من ذلك" };
  }
  await prisma.product.delete({ where: { id } });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  await triggerSheetsSync();
  return { ok: true, message: "تم حذف المنتج نهائيًا" };
}

const SETTINGS_KEYS = new Set([
  "shopName",
  "shopLogo",
  "whatsappNumber",
  "shamCashNumber",
  "countryCode",
  "currency",
  "currencyPosition",
  "defaultLeadTime",
  "deliveryFee",
  "lowStockThreshold",
  "googleSheetId",
]);

export async function saveSettings(entries: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();

  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (!SETTINGS_KEYS.has(key)) continue;
    clean[key] = typeof value === "string" ? value.trim().slice(0, 500) : String(value);
  }

  if (clean.shopName !== undefined && !clean.shopName) {
    return { ok: false, message: "اسم المتجر مطلوب" };
  }
  if (clean.currency !== undefined && !clean.currency) {
    return { ok: false, message: "رمز العملة مطلوب" };
  }
  if (clean.currencyPosition !== undefined) {
    clean.currencyPosition = clean.currencyPosition === "before" ? "before" : "after";
  }
  if (clean.countryCode !== undefined) {
    const digits = clean.countryCode.replace(/[^\d]/g, "");
    if (!digits || digits.length > 4) {
      return { ok: false, message: "رمز الدولة يجب أن يكون من 1 إلى 4 أرقام" };
    }
    clean.countryCode = digits;
  }
  if (clean.deliveryFee !== undefined) {
    const fee = safeMoney(clean.deliveryFee, NaN);
    if (!Number.isFinite(fee)) {
      return { ok: false, message: "رسوم التوصيل يجب أن تكون رقمًا غير سالب" };
    }
    clean.deliveryFee = String(fee);
  }
  if (clean.lowStockThreshold !== undefined) {
    const threshold = safeInt(clean.lowStockThreshold, NaN, 0);
    if (!Number.isFinite(threshold)) {
      return { ok: false, message: "حد تنبيه المخزون يجب أن يكون عددًا صحيحًا غير سالب" };
    }
    clean.lowStockThreshold = String(threshold);
  }

  await setSettingsMany(clean);
  return { ok: true, message: "تم حفظ الإعدادات" };
}

export async function changeAdminPassword(plain: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  if (plain.length < 6) return { ok: false, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  await setAdminPassword(plain);
  return { ok: true, message: "تم تغيير كلمة المرور" };
}

export async function syncSheetsNow(): Promise<SyncResult> {
  await requireAdmin();
  return forceSyncSheets();
}