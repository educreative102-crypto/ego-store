import Link from "next/link";
import { fetchCategoryOptions } from "@/lib/categories";
import { ProductForm } from "@/components/admin/product-form";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await fetchCategoryOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black">منتج جديد</h1>
      {categories.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="أضف فئة أولًا"
            description="كل منتج يحتاج فئة — أنشئ فئة من صفحة الفئات ثم عد إلى هنا"
          />
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            إدارة الفئات
          </Link>
        </div>
      ) : (
        <ProductForm categories={categories} />
      )}
    </div>
  );
}
