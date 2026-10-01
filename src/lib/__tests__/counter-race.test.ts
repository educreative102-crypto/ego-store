import { describe, expect, it, vi, beforeEach } from "vitest";
import { bumpCounter } from "../settings";

const { state } = vi.hoisted(() => ({ state: new Map<string, string>() }));

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

vi.mock("../prisma", () => ({
  prisma: {
    setting: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        await tick();
        const value = state.get(where.key);
        return value === undefined ? null : { key: where.key, value };
      }),
      updateMany: vi.fn(
        async ({ where, data }: { where: { key: string; value: string }; data: { value: string } }) => {
          await tick();
          if (state.get(where.key) === where.value) {
            state.set(where.key, data.value);
            return { count: 1 };
          }
          return { count: 0 };
        }
      ),
      create: vi.fn(async ({ data }: { data: { key: string; value: string } }) => {
        await tick();
        if (state.has(data.key)) {
          throw Object.assign(new Error("unique violated"), { code: "P2002" });
        }
        state.set(data.key, data.value);
        return { key: data.key, value: data.value };
      }),
    },
  },
}));

describe("bumpCounter concurrency", () => {
  beforeEach(() => {
    state.clear();
  });

  it("yields unique sequential numbers under a 4-way burst", async () => {
    state.set("ORD_COUNTER", "0");

    const results = await Promise.all(
      Array.from({ length: 4 }, () => bumpCounter("ORD_COUNTER"))
    );

    expect(results).toHaveLength(4);
    expect([...new Set(results)]).toHaveLength(4);
    expect(Math.max(...results)).toBe(4);
    expect(state.get("ORD_COUNTER")).toBe("4");
  });

  it("never loses an increment when two bumps collide", async () => {
    state.set("INV_COUNTER", "5");

    const results = await Promise.all([bumpCounter("INV_COUNTER"), bumpCounter("INV_COUNTER")]);

    expect([...results].sort((a, b) => a - b)).toEqual([6, 7]);
    expect(state.get("INV_COUNTER")).toBe("7");
  });

  it("creates the row once and resumes without duplicating the seed", async () => {
    const results = await Promise.all([bumpCounter("SKU_COUNTER"), bumpCounter("SKU_COUNTER")]);

    expect([...results].sort((a, b) => a - b)).toEqual([1, 2]);
    expect(state.get("SKU_COUNTER")).toBe("2");
  });
});