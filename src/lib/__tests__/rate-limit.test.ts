import { describe, expect, it, vi, beforeEach } from "vitest";

interface FakeRow {
  key: string;
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
}

const { rows } = vi.hoisted(() => ({ rows: new Map<string, unknown>() }));

vi.mock("../prisma", () => ({
  prisma: {
    rateBucket: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => rows.get(where.key) ?? null),
      create: vi.fn(async ({ data }: { data: { key: string } }) => {
        await new Promise<void>((r) => setTimeout(r, 0));
        if (rows.has(data.key)) throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = { key: data.key, count: 1, windowStart: new Date(), blockedUntil: null };
        rows.set(data.key, row);
        return row;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { key: string; count: number; windowStart: Date; blockedUntil: Date | null };
          data: { count: number; windowStart: Date; blockedUntil: Date | null };
        }) => {
          await new Promise<void>((r) => setTimeout(r, 0));
          const row = rows.get(where.key) as FakeRow | undefined;
          if (!row) return { count: 0 };
          const matches =
            row.count === where.count &&
            row.windowStart.getTime() === where.windowStart.getTime() &&
            (row.blockedUntil?.getTime() ?? null) === (where.blockedUntil?.getTime() ?? null);
          if (!matches) return { count: 0 };
          row.count = data.count;
          row.windowStart = data.windowStart;
          row.blockedUntil = data.blockedUntil;
          return { count: 1 };
        }
      ),
      deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => {
        const had = rows.delete(where.key);
        return { count: had ? 1 : 0 };
      }),
    },
  },
}));

const RULE = { windowMs: 60_000, max: 3 };
const rowOf = (key: string) => rows.get(key) as FakeRow | undefined;

describe("rateLimitHit", () => {
  beforeEach(() => {
    rows.clear();
  });

  it("يسمح حتى الحد ثم يحجب", async () => {
    const { rateLimitHit } = await import("../rate-limit");
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimitHit("k1", RULE));
    expect(results).toEqual([false, false, false, true, true]);
  });

  it("لا يتجاوز الحد تحت تزامن 8-way", async () => {
    const { rateLimitHit } = await import("../rate-limit");
    await rateLimitHit("k2", RULE);

    const results = await Promise.all(Array.from({ length: 8 }, () => rateLimitHit("k2", RULE)));
    const all = [false, ...results];

    expect(all.filter((r) => r === false)).toHaveLength(RULE.max);
    expect(all.filter((r) => r === true)).toHaveLength(9 - RULE.max);
  });

  it("يبقى محجوبًا ولا يمدّد الحجب مع كل محاولة", async () => {
    const { rateLimitHit } = await import("../rate-limit");
    for (let i = 0; i < 3; i++) expect(await rateLimitHit("k3", RULE)).toBe(false);
    expect(await rateLimitHit("k3", RULE)).toBe(true);
    const blockedAt = rowOf("k3")?.blockedUntil?.getTime();
    expect(await rateLimitHit("k3", RULE)).toBe(true);
    expect(rowOf("k3")?.blockedUntil?.getTime()).toBe(blockedAt);
    expect(rowOf("k3")?.count).toBe(4);
  });

  it("rateLimitClear يفتح المجال من جديد", async () => {
    const { rateLimitHit, rateLimitClear } = await import("../rate-limit");
    for (let i = 0; i < 4; i++) await rateLimitHit("k4", RULE);
    expect(await rateLimitHit("k4", RULE)).toBe(true);

    await rateLimitClear("k4");

    expect(rows.has("k4")).toBe(false);
    expect(await rateLimitHit("k4", RULE)).toBe(false);
  });

  it("يفصل المفاتيح عن بعضها", async () => {
    const { rateLimitHit } = await import("../rate-limit");
    for (let i = 0; i < 4; i++) await rateLimitHit("ipA", RULE);
    expect(await rateLimitHit("ipA", RULE)).toBe(true);
    expect(await rateLimitHit("ipB", RULE)).toBe(false);
  });
});
