import { prisma } from "./prisma";
import { hash } from "bcryptjs";
import { cache } from "react";

export interface AppSettings {
  shopName: string;
  shopLogo: string;
  whatsappNumber: string;
  shamCashNumber: string;
  countryCode: string;
  currency: string;
  currencyPosition: "before" | "after";
  defaultLeadTime: string;
  deliveryFee: number;
  lowStockThreshold: number;
  googleSheetId: string;
  googleSheetStatus: string;
  lastSyncAt: string;
}

const DEFAULTS: Record<string, string> = {
  shopName: "EGO Store",
  shopLogo: "",
  whatsappNumber: "",
  shamCashNumber: "",
  countryCode: "963",
  currency: "$",
  currencyPosition: "after",
  defaultLeadTime: "3-5 أيام",
  deliveryFee: "0",
  lowStockThreshold: "5",
  googleSheetId: "",
  googleSheetStatus: "غير مربوط",
  adminPasswordHash: "",
  ORD_COUNTER: "0",
  INV_COUNTER: "0",
  SKU_COUNTER: "0",
};

let seededOk = false;
let seedPromise: Promise<void> | null = null;

async function seedSettings(): Promise<void> {
  const existing = await prisma.setting.findMany();
  const keys = new Set(existing.map((s) => s.key));
  const missing = Object.entries(DEFAULTS).filter(([k]) => !keys.has(k));
  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: {},
          create: { key, value },
        })
      )
    );
  }
  seededOk = true;
}

export async function ensureSettingsSeeded(): Promise<void> {
  if (seededOk) return;
  seedPromise ??= seedSettings().catch((error) => {
    seedPromise = null;
    throw error;
  });
  await seedPromise;
}

export async function getSettingsMap(): Promise<Record<string, string>> {
  await ensureSettingsSeeded();
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export const getSettings = cache(async function getSettings(): Promise<AppSettings> {
  const map = await getSettingsMap();
  const deliveryFee = parseFloat(map.deliveryFee);
  const lowStockThreshold = parseInt(map.lowStockThreshold, 10);
  return {
    shopName: map.shopName || DEFAULTS.shopName,
    shopLogo: map.shopLogo || "",
    whatsappNumber: map.whatsappNumber || "",
    shamCashNumber: map.shamCashNumber || "",
    countryCode: (map.countryCode || DEFAULTS.countryCode).replace(/[^\d]/g, "") || DEFAULTS.countryCode,
    currency: map.currency || DEFAULTS.currency,
    currencyPosition: map.currencyPosition === "before" ? "before" : "after",
    defaultLeadTime: map.defaultLeadTime || DEFAULTS.defaultLeadTime,
    deliveryFee: Number.isFinite(deliveryFee) && deliveryFee >= 0 ? deliveryFee : 0,
    lowStockThreshold:
      Number.isFinite(lowStockThreshold) && lowStockThreshold >= 0 ? lowStockThreshold : 5,
    googleSheetId: map.googleSheetId || "",
    googleSheetStatus: map.googleSheetStatus || DEFAULTS.googleSheetStatus,
    lastSyncAt: map.lastSyncAt || "",
  };
});

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function setSettingsMany(entries: Record<string, string>): Promise<void> {
  const list = Object.entries(entries);
  if (list.length === 0) return;
  await prisma.$transaction(
    list.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
}

export async function bumpCounter(name: string): Promise<number> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await prisma.setting.findUnique({ where: { key: name } });
    const current = parseInt(row?.value ?? "0", 10) || 0;
    const next = current + 1;
    if (row) {
      const updated = await prisma.setting.updateMany({
        where: { key: name, value: String(current) },
        data: { value: String(next) },
      });
      if (updated.count === 1) return next;
      continue;
    }
    try {
      await prisma.setting.create({ data: { key: name, value: String(next) } });
      return next;
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error(`تعذر حجز رقم تسلسلي: ${name}`);
}

export async function ensureAdminPassword(): Promise<void> {
  await ensureSettingsSeeded();
  const row = await prisma.setting.findUnique({ where: { key: "adminPasswordHash" } });
  if ((row?.value || "") === "" && process.env.ADMIN_PASSWORD) {
    const hashed = await hash(process.env.ADMIN_PASSWORD, 10);
    await prisma.setting.upsert({
      where: { key: "adminPasswordHash" },
      update: { value: hashed },
      create: { key: "adminPasswordHash", value: hashed },
    });
  }
}

export async function setAdminPassword(plain: string): Promise<void> {
  const hashed = await hash(plain, 10);
  await prisma.setting.upsert({
    where: { key: "adminPasswordHash" },
    update: { value: hashed },
    create: { key: "adminPasswordHash", value: hashed },
  });
}