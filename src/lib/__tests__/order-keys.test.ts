import { describe, it, expect } from "vitest";
import { pad, nextSku, nextOrderNo, nextInvoiceNo } from "../order-keys";

describe("order-keys", () => {
  it("pads numbers", () => {
    expect(pad(3, 4)).toBe("0003");
    expect(pad(42, 3)).toBe("042");
    expect(pad(9999, 4)).toBe("9999");
  });

  it("generates sku with prefix", () => {
    expect(nextSku("EGO", 14)).toBe("EGO-014");
    expect(nextSku("EGO", 3)).toBe("EGO-003");
  });

  it("generates serial numbers", () => {
    expect(nextOrderNo(5)).toBe("ORD-0005");
    expect(nextInvoiceNo(12)).toBe("INV-0012");
  });
});