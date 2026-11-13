import Link from "next/link";
import { StockPolicy } from "@prisma/client";
import { fetchCatalog } from "@/lib/catalog";
import { fetchCategories } from "@/lib/categories";
import { getSettings } from "@/lib/settings";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; recipe?: string; q?: string; available?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category?.trim().slice(0, 80) || undefined;
  const policy =
    params.recipe && (Object.values(StockPolicy) as string[]).includes(params.recipe)
      ? (params.recipe as StockPolicy)
      : undefined;
  const q = params.q?.trim().slice(0, 100) || undefined;
  const onlyAvailable = params.available === "1";

  const [settings, products, categories] = await Promise.all([
    getSettings(),
    fetchCatalog({
      categorySlug,
      policy,
      search: q,
      includeSoldOut: !onlyAvailable,
    }),
    fetchCategories(),
  ]);

  const isAll = !categorySlug && !policy && !onlyAvailable;
  const activeCategory = categories.find(
    (category) => category.slug.toLowerCase() === categorySlug?.toLowerCase()
  );
  const visibleCategories = categories.filter(
    (category) => category.productCount > 0 || category.id === activeCategory?.id
  );

  const filterClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold transition-colors ${
      active ? "bg-primary text-white shadow-sm" : "bg-white text-zinc-600 hover:bg-primary-soft hover:text-primary-strong"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
        الكتالوج
        <span className="rounded-full bg-primary-soft px-3 py-0.5 text-sm font-bold text-primary-strong">
          {products.length}
        </span>
      </h1>
      <p className="mt-1 text-sm text-zinc-500">اختر قطعتك واطلبها عبر واتساب بضغطة واحدة</p>

      <div className="mt-6 space-y-3">
        <form method="get" className="flex gap-2">
          {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
          {policy ? <input type="hidden" name="recipe" value={policy} /> : null}
          {onlyAvailable ? <input type="hidden" name="available" value="1" /> : null}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="ابحث بالاسم أو الرمز EGO-xxx..."
            className="w-full max-w-sm rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-700">
            بحث
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/products" className={filterClass(isAll)}>
            الكل
          </Link>
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className={filterClass(category.id === activeCategory?.id)}
            >
              {category.name}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-zinc-200" />
          <Link href="/products?recipe=MADE_TO_ORDER" className={filterClass(policy === "MADE_TO_ORDER")}>
            طباعة عند الطلب
          </Link>
          <Link href="/products?available=1" className={filterClass(onlyAvailable && !categorySlug && !policy)}>
            المتوفر الآن
          </Link>
          {categorySlug || policy || onlyAvailable || q ? (
            <Link
              href="/products"
              className="rounded-full px-3 py-2 text-sm font-bold text-zinc-400 transition-colors hover:text-zinc-600"
            >
              مسح الفلترة ✕
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            لا توجد منتجات مطابقة — جرّب فلترة أخرى
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                settings={settings}
                lowStockThreshold={settings.lowStockThreshold}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
