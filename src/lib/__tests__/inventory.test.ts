import { describe, it, expect } from "vitest";
import {
  remaining,
  isSoldOut,
  isAvailable,
  variantKey,
  orderTotal,
  orderCost,
  profit,
  profitMargin,
} from "../inventory";
import { StockPolicy } from "@prisma/client";

describe("inventory", () => {
  it("computes remaining = received - confirmed", () => {
    expect(remaining({ stockQty: 10, confirmedQty: 2 })).toBe(8);
    expect(remaining({ stockQty: 8, confirmedQty: 25 })).toBe(0);
  });

  it("marks sold out only for STOCKED at zero", () => {
    expect(isSoldOut(StockPolicy.STOCKED, { stockQty: 0, confirmedQty: 0 })).toBe(true);
    expect(isSoldOut(StockPolicy.STOCKED, { stockQty: 5, confirmedQty: 2 })).toBe(false);
    expect(isSoldOut(StockPolicy.MADE_TO_ORDER, { stockQty: 0, confirmedQty: 0 })).toBe(false);
  });

  it("made-to-order is always available", () => {
    expect(isAvailable(StockPolicy.MADE_TO_ORDER, { stockQty: 0, confirmedQty: 99 })).toBe(true);
    expect(isAvailable(StockPolicy.STOCKED, { stockQty: 3, confirmedQty: 1 })).toBe(true);
    expect(isAvailable(StockPolicy.STOCKED, { stockQty: 3, confirmedQty: 3 })).toBe(false);
  });

  it("variantKey يتجاهل الفراغات حول المقاس واللون", () => {
    expect(variantKey("p1", " L ", "أسود ")).toBe("p1|L|أسود");
    expect(variantKey("p1", "L", "أسود")).toBe(variantKey("p1", "L ", " أسود"));
  });

  it("variantKey لا يخلط بين منتجين مختلفين بنفس المقاس واللون", () => {
    expect(variantKey("p1", "L", "أسود")).not.toBe(variantKey("p2", "L", "أسود"));
  });

  it("totals and profit", () => {
    expect(orderTotal([{ unitPrice: 45, quantity: 2 }, { unitPrice: 10, quantity: 1 }])).toBe(100);
    expect(orderCost([{ unitCost: 20, quantity: 2 }])).toBe(40);
    expect(profit(100, 40)).toBe(60);
    expect(profitMargin(100, 40)).toBe(60);
    expect(profitMargin(0, 10)).toBe(0);
  });
});