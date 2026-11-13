import { prisma } from "./prisma";

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  productCount: number;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const CATEGORY_ORDER = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

export async function fetchCategories(): Promise<CategoryWithCount[]> {
  const categories = await prisma.productCategory.findMany({
    orderBy: CATEGORY_ORDER,
    include: { _count: { select: { products: true } } },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    productCount: category._count.products,
  }));
}

export async function fetchCategoryOptions(): Promise<CategoryOption[]> {
  return prisma.productCategory.findMany({
    orderBy: CATEGORY_ORDER,
    select: { id: true, name: true },
  });
}
