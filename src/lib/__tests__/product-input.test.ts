import { describe, expect, it } from "vitest";
import { safeMoney, safeInt, normalizeVariants } from "../product-input";

describe("safeMoney", () => {
  it("يقبل الأرقام المنتهية غير السالبة", () => {
    expect(safeMoney(45)).toBe(45);
    expect(safeMoney(0)).toBe(0);
    expect(safeMoney("120.5")).toBe(120.5);
  });

  it("يرفض غير المنتهية", () => {
    expect(safeMoney(Infinity)).toBe(0);
    expect(safeMoney(-Infinity)).toBe(0);
    expect(safeMoney(NaN)).toBe(0);
  });

  it("يرفض السالب", () => {
    expect(safeMoney(-1)).toBe(0);
    expect(safeMoney(-0.01)).toBe(0);
  });

  it("يرفض غير الرقمي", () => {
    expect(safeMoney("abc")).toBe(0);
    expect(safeMoney(undefined)).toBe(0);
    expect(safeMoney(null)).toBe(0);
  });
});

describe("safeInt", () => {
  it("يقصّ الكسر ولا يتجاوز الحد الأدنى", () => {
    expect(safeInt(4.7, 0)).toBe(4);
    expect(safeInt(-3, 0)).toBe(0);
    expect(safeInt(2, 0, 1)).toBe(2);
    expect(safeInt(0, 0, 1)).toBe(1);
  });

  it("يرفض غير المنتهية ويستخدم البديل", () => {
    expect(safeInt(Infinity, 3)).toBe(3);
    expect(safeInt(NaN, 3)).toBe(3);
  });
});

describe("normalizeVariants", () => {
  it("يزيل التكرار ويأخذ آخر قيمة", () => {
    const out = normalizeVariants([
      { size: "L", color: "أسود", stockQty: 5 },
      { size: "L", color: "أسود", stockQty: 9 },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].stockQty).toBe(9);
  });

  it("يعدّ التكرار بعد قصّ الفراغات", () => {
    const out = normalizeVariants([
      { size: " L ", color: "أسود", stockQty: 5 },
      { size: "L", color: " أسود ", stockQty: 9 },
    ]);

    expect(out).toHaveLength(1);
  });

  it("يحذف الصفوف الفارغة", () => {
    const out = normalizeVariants([
      { size: "  ", color: "أسود", stockQty: 5 },
      { size: "L", color: "", stockQty: 5 },
    ]);

    expect(out).toEqual([]);
  });

  it("يبقي المقاسات والألوان المختلفة", () => {
    const out = normalizeVariants([
      { size: "L", color: "أسود", stockQty: 5 },
      { size: "XL", color: "أسود", stockQty: 5 },
    ]);

    expect(out).toHaveLength(2);
  });

  it("يمنع الكمية غير المنتهية والسالبة", () => {
    const out = normalizeVariants([
      { size: "L", color: "أسود", stockQty: Infinity },
      { size: "XL", color: "أسود", stockQty: -5 },
    ]);

    expect(out.map((v) => v.stockQty)).toEqual([0, 0]);
  });
});