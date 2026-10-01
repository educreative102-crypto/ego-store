"use server";

import { Category, StockPolicy } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { bumpCounter, setSettingsMany, setAdminPassword } from "./settings";
import { nextSku } from "./order-keys";
import { slugify } from "./slug";
import { syncSheets } from "./sheets/sync";
import { CATALOG_TAG } from "./catalog";
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
  if (!(input.basePrice >= 0)) return { ok: false, message: "سعر البيع غير صحيح" };
  const cleanVariants = input.variants.filter((v) => v.size.trim() && v.color.trim());

  const data = {
    name,
    description: input.description.trim(),
    category: input.category,
    stockPolicy: input.stockPolicy,
    basePrice: input.basePrice,
    costPrice: input.costPrice || 0,
    designName: input.designName.trim(),
    printDetails: input.printDetails.trim(),
    leadTimeDays: input.leadTimeDays || 3,
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
            size: v.size.trim(),
            color: v.color.trim(),
            stockQty: Math.max(0, v.stockQty || 0),
          })),
        });
      }
    });
    revalidateTag(CATALOG_TAG, { expire: 0 });
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
          size: v.size.trim(),
          color: v.color.trim(),
          stockQty: Math.max(0, v.stockQty || 0),
        })),
      },
    },
  });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return { ok: true, message: "تم إنشاء المنتج برمز " + sku, id: product.id };
}

export async function toggleProductActive(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { ok: false, message: "المنتج غير موجود" };
  await prisma.product.update({ where: { id }, data: { active: !product.active } });
  revalidateTag(CATALOG_TAG, { expire: 0 });
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
  return { ok: true, message: "تم حذف المنتج نهائيًا" };
}

export async function saveSettings(entries: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  await setSettingsMany(entries);
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
  return syncSheets();
}