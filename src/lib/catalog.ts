import { Category, Product, StockPolicy } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { remaining, isSoldOut, isAvailable } from "./inventory";
import { SOLD_STATUSES } from "./sold-statuses";

export const CATALOG_TAG = "catalog";

export type VariantWithBalance = {
  id: string;
  size: string;
  color: string;
  stockQty: number;
  confirmedQty: number;
  remaining: number;
  soldOut: boolean;
  available: boolean;
};

export type ProductWithBalance = Product & {
  variants: VariantWithBalance[];
  allSoldOut: boolean;
  mainImage: string | null;
};

export interface CatalogFilter {
  category?: Category;
  policy?: StockPolicy;
  search?: string;
  includeSoldOut?: boolean;
  onlyActive?: boolean;
}

export async function rawFetchCatalog(
  filter: CatalogFilter = {}
): Promise<ProductWithBalance[]> {
  const { category, policy, search, includeSoldOut = true, onlyActive = true } = filter;
  const products = await prisma.product.findMany({
    where: {
      ...(onlyActive ? { active: true } : {}),
      ...(category ? { category } : {}),
      ...(policy ? { stockPolicy: policy } : {}),
      ...(search
        ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] }
        : {}),
    },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  const productIds = products.map((p) => p.id);
  const aggs =
    productIds.length > 0
      ? await prisma.orderItem.groupBy({
          by: ["productId", "size", "color"],
          where: {
            order: { status: { in: SOLD_STATUSES } },
            productId: { in: productIds },
          },
          _sum: { quantity: true },
        })
      : [];
  const aggByKey = new Map<string, number>();
  for (const agg of aggs) {
    aggByKey.set(
      `${agg.productId}|${agg.size}|${agg.color}`,
      (aggByKey.get(`${agg.productId}|${agg.size}|${agg.color}`) ?? 0) +
        (agg._sum.quantity ?? 0)
    );
  }

  const result: ProductWithBalance[] = [];
  for (const p of products) {
    const mainImage = parseImageList(p.images)[0] ?? null;
    const variants: VariantWithBalance[] = p.variants.map((v) => {
      const confirmedQty = aggByKey.get(`${p.id}|${v.size}|${v.color}`) ?? 0;
      const balance = { stockQty: v.stockQty, confirmedQty };
      return {
        id: v.id,
        size: v.size,
        color: v.color,
        stockQty: v.stockQty,
        confirmedQty,
        remaining: remaining(balance),
        soldOut: isSoldOut(p.stockPolicy, balance),
        available: isAvailable(p.stockPolicy, balance),
      };
    });
    const allSoldOut =
      p.stockPolicy === StockPolicy.STOCKED
        ? variants.every((v) => v.soldOut) || variants.length === 0
        : false;
    if (!includeSoldOut && allSoldOut) continue;
    result.push({ ...p, variants, allSoldOut, mainImage });
  }

  return result;
}

export const fetchCatalog = unstable_cache(rawFetchCatalog, ["ego-catalog-page"], {
  tags: [CATALOG_TAG],
  revalidate: 60,
});

export async function rawFetchProductBySlug(
  slug: string
): Promise<ProductWithBalance | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: true },
  });
  if (!product) return null;

  const aggs = await prisma.orderItem.groupBy({
    by: ["size", "color"],
    where: { order: { status: { in: SOLD_STATUSES } }, productId: product.id },
    _sum: { quantity: true },
  });
  const aggByKey = new Map<string, number>();
  for (const agg of aggs) {
    aggByKey.set(
      `${agg.size}|${agg.color}`,
      (aggByKey.get(`${agg.size}|${agg.color}`) ?? 0) + (agg._sum.quantity ?? 0)
    );
  }

  const variants: VariantWithBalance[] = product.variants.map((v) => {
    const confirmedQty = aggByKey.get(`${v.size}|${v.color}`) ?? 0;
    const balance = { stockQty: v.stockQty, confirmedQty };
    return {
      id: v.id,
      size: v.size,
      color: v.color,
      stockQty: v.stockQty,
      confirmedQty,
      remaining: remaining(balance),
      soldOut: isSoldOut(product.stockPolicy, balance),
      available: isAvailable(product.stockPolicy, balance),
    };
  });
  const allSoldOut =
    product.stockPolicy === StockPolicy.STOCKED
      ? variants.every((v) => v.soldOut) || variants.length === 0
      : false;

  return {
    ...product,
    variants,
    allSoldOut,
    mainImage: parseImageList(product.images)[0] ?? null,
  };
}

export const fetchProductBySlug = unstable_cache(rawFetchProductBySlug, ["ego-product-page"], {
  tags: [CATALOG_TAG],
  revalidate: 60,
});

export function parseImageList(images: string): string[] {
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // ignore
  }
  return [];
}