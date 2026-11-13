import { fetchCategories } from "@/lib/categories";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">الفئات</h1>
        <p className="mt-1 text-sm text-zinc-500">
          أنشئ أي فئة تريدها — تظهر فورًا كفلتر في الكتالوج وقسم في الصفحة الرئيسية.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
