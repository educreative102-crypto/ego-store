import { describe, it, expect } from "vitest";
import { buildWhatsAppLink, buildOrderMessage, buildCustomPrintMessage, buildInvoiceMessage } from "../whatsapp";

const settings = {
  shopName: "EGO Store",
  shopLogo: "",
  whatsappNumber: "0961 123-456",
  shamCashNumber: "09 873 654",
  currency: "$",
  currencyPosition: "after" as const,
  defaultLeadTime: "3-5 أيام",
  deliveryFee: 0,
  lowStockThreshold: 5,
  googleSheetId: "",
  googleSheetStatus: "غير مربوط",
  googleServiceAccountJson: "",
  lastSyncAt: "",
};

describe("whatsapp", () => {
  it("builds clean wa.me link from messy number", () => {
    const link = buildWhatsAppLink("+963 (11) 123-456", "مرحبًا");
    expect(link).toContain("/wa.me/96311123456");
    expect(link).toContain(encodeURIComponent("مرحبًا"));
  });

  it("returns null when number empty", () => {
    expect(buildWhatsAppLink("", "نص")).toBeNull();
    expect(buildWhatsAppLink("   ", "نص")).toBeNull();
  });

  it("builds a complete order message", () => {
    const message = buildOrderMessage(
      settings,
      [{ name: "كنزة سوداء", sku: "EGO-014", size: "L", color: "أسود", quantity: 2, unitPrice: 45 }],
      { customerName: "محمود", hasMadeToOrder: true }
    );
    expect(message).toContain("EGO-014");
    expect(message).toContain("L");
    expect(message).toContain("90$");
    expect(message).toContain("شام كاش 09 873 654");
    expect(message).toContain("3-5 أيام");
  });

  it("adds delivery fee to total when set", () => {
    const withFee = { ...settings, deliveryFee: 5 };
    const message = buildOrderMessage(
      withFee,
      [{ name: "تيشيرت", sku: "EGO-020", size: "M", color: "أبيض", quantity: 1, unitPrice: 25 }]
    );
    expect(message).toContain("30$");
    expect(message).toContain("التوصيل: 5$");
  });

  it("keeps language clean without mention of empty numbers", () => {
    const noSham = { ...settings, shamCashNumber: "" };
    const message = buildOrderMessage(
      noSham,
      [{ name: "بدون", sku: "EGO-001", size: "S", color: "رمادي", quantity: 1, unitPrice: 30 }]
    );
    expect(message).not.toContain("شام كاش");
  });

  it("builds custom print and invoice messages", () => {
    expect(buildCustomPrintMessage(settings)).toContain("فكرة خاصة");
    const inv = buildInvoiceMessage(settings, "INV-0001", "ORD-0002", 90);
    expect(inv).toContain("INV-0001");
    expect(inv).toContain("90$");
  });
});