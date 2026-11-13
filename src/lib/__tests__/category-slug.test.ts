import { describe, expect, it } from "vitest";
import { categorySlugFrom, uniqueCategorySlug } from "../category-slug";

describe("categorySlugFrom", () => {
  it("يشتق الرابط من الاسم العربي", () => {
    expect(categorySlugFrom("بناطيل")).toBe("bnatyl");
  });

  it("يستخدم الرابط الصريح عند توفره", () => {
    expect(categorySlugFrom("بناطيل", "Pants")).toBe("pants");
  });

  it("يتجاهل الرابط الصريح الفارغ ويعود للاسم", () => {
    expect(categorySlugFrom("كابات", "   ")).toBe("kabat");
  });

  it("ينظّف الرموز والمسافات", () => {
    expect(categorySlugFrom("T-Shirts & More!")).toBe("t-shirts-more");
  });

  it("يستخدم fallback عند تعذّر الاشتقاق", () => {
    expect(categorySlugFrom("👕")).toBe("category");
  });
});

describe("uniqueCategorySlug", () => {
  it("يبقي الرابط إن كان غير مستخدم", () => {
    expect(uniqueCategorySlug("pants", ["hoodie", "tshirt"])).toBe("pants");
  });

  it("يضيف لاحقة رقمية عند التكرار", () => {
    expect(uniqueCategorySlug("pants", ["pants"])).toBe("pants-2");
    expect(uniqueCategorySlug("pants", ["pants", "pants-2"])).toBe("pants-3");
  });

  it("يطابق بغض النظر عن حالة الأحرف", () => {
    expect(uniqueCategorySlug("pants", ["PANTS"])).toBe("pants-2");
  });
});
