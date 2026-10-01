import Link from "next/link";
import { Category, StockPolicy } from "@prisma/client";
import { fetchCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; recipe?: string; q?: string; available?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();

  const category =
    params.category && (Object.values(Category) as string[]).includes(params.category)
      ? (params.category as Category)
      : undefined;
  const policy =
    params.recipe && (Object.values(StockPolicy) as string[]).includes(params.recipe)
      ? (params.recipe as StockPolicy)
      : undefined;
  const q = params.q?.trim().slice(0, 100) || undefined;
  const onlyAvailable = params.available === "1";

  const products = await fetchCatalog({
    category,
    policy,
    search: q,
    includeSoldOut: !onlyAvailable,
  });

  const isAll = !category && !policy && !onlyAvailable;

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
          <Link href="/products?category=HOODIE" className={filterClass(category === "HOODIE")}>
            هوديز
          </Link>
          <Link href="/products?category=TSHIRT" className={filterClass(category === "TSHIRT")}>
            تيشيرتات
          </Link>
          <span className="mx-1 h-5 w-px bg-zinc-200" />
          <Link href="/products?recipe=MADE_TO_ORDER" className={filterClass(policy === "MADE_TO_ORDER")}>
            طباعة عند الطلب
          </Link>
          <Link href="/products?available=1" className={filterClass(onlyAvailable && !category && !policy)}>
            المتوفر الآن
          </Link>
          {onlyAvailable || q ? (
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