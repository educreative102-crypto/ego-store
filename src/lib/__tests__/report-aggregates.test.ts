import { describe, expect, it } from "vitest";
import { aggregateSoldItems } from "../report-aggregates";

describe("aggregateSoldItems", () => {
  it("combines multiple lines of the same product", () => {
    const result = aggregateSoldItems([
      { productId: "p1", quantity: 2, unitPrice: 10, unitCost: 4 },
      { productId: "p1", quantity: 3, unitPrice: 10, unitCost: 4 },
      { productId: "p2", quantity: 1, unitPrice: 50, unitCost: 20 },
    ]);

    expect(result.get("p1")).toEqual({ qty: 5, revenue: 50, cost: 20 });
    expect(result.get("p2")).toEqual({ qty: 1, revenue: 50, cost: 20 });
  });

  it("computes revenue and cost per quantity", () => {
    const result = aggregateSoldItems([
      { productId: "p1", quantity: 4, unitPrice: 25, unitCost: 10 },
    ]);

    expect(result.get("p1")).toEqual({ qty: 4, revenue: 100, cost: 40 });
  });

  it("returns an empty map for empty input", () => {
    expect(aggregateSoldItems([]).size).toBe(0);
  });
});