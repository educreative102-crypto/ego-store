import { describe, it, expect, vi, beforeEach } from "vitest";

const { rows } = vi.hoisted(() => ({ rows: new Map<string, string>() }));

vi.mock("../prisma", () => ({
  prisma: {
    setting: {
      findMany: vi.fn(async () => [...rows].map(([key, value]) => ({ key, value }))),
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const value = rows.get(where.key);
        return value === undefined ? null : { key: where.key, value };
      }),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { key: string; value: string } }) => {
        rows.set(create.key, create.value);
        return { key: where.key, value: create.value };
      }),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));

const LEAKED = JSON.stringify({
  type: "service_account",
  private_key: "-----BEGIN PRIVATE KEY-----\nLEAKED\n-----END PRIVATE KEY-----\n",
});

describe("getSettings — منع تسرّب الأسرار", () => {
  beforeEach(() => {
    vi.resetModules();
    rows.clear();
    rows.set("shopName", "EGO");
    rows.set("whatsappNumber", "0961");
    rows.set("deliveryFee", "5");
  });

  it("لا يصدّر مفتاح الخدمة حتى لو كان مخزّنًا في قاعدة البيانات", async () => {
    rows.set("googleServiceAccountJson", LEAKED);
    const { getSettings } = await import("../settings");

    const settings = await getSettings();

    expect(settings).not.toHaveProperty("googleServiceAccountJson");
    expect(JSON.stringify(settings)).not.toContain("BEGIN PRIVATE KEY");
    expect(JSON.stringify(settings)).not.toContain("LEAKED");
  });

  it("يقرأ القيم العادية بشكل صحيح", async () => {
    const { getSettings } = await import("../settings");

    const settings = await getSettings();

    expect(settings.shopName).toBe("EGO");
    expect(settings.whatsappNumber).toBe("0961");
    expect(settings.deliveryFee).toBe(5);
    expect(settings.currencyPosition).toBe("after");
  });

  it("لا يحمل أي اسم يشير إلى مفتاح الخدمة ضمن مفاتيحه", async () => {
    const { getSettings } = await import("../settings");
    const settings = await getSettings();
    expect(Object.keys(settings).join(",")).not.toMatch(/serviceaccount|privatekey|json/i);
  });
});
