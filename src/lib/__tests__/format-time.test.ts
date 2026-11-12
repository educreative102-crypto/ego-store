import { describe, expect, it } from "vitest";
import { shopStartOfDay, shopStartOfMonth } from "../format";

describe("shop time boundaries (UTC+3)", () => {
  it("starts the day at 00:00 Damascus time", () => {
    const now = new Date("2026-11-12T21:30:00.000Z");
    expect(shopStartOfDay(now).toISOString()).toBe("2026-11-12T21:00:00.000Z");
  });

  it("starts the month at 00:00 Damascus time on the first", () => {
    const now = new Date("2026-11-01T00:30:00.000Z");
    expect(shopStartOfMonth(now).toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });

  it("moves to the next day after Damascus midnight", () => {
    const before = new Date("2026-11-12T20:59:00.000Z");
    const after = new Date("2026-11-12T21:01:00.000Z");
    expect(shopStartOfDay(before).toISOString()).toBe("2026-11-11T21:00:00.000Z");
    expect(shopStartOfDay(after).toISOString()).toBe("2026-11-12T21:00:00.000Z");
  });
});
