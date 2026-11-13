import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseImageList } from "@/lib/catalog";
import { fetchCategoryOptions } from "@/lib/categories";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    }),
    fetchCategoryOptions(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black">
        تعديل {product.name} <span className="text-zinc-400">({product.sku})</span>
      </h1>
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          stockPolicy: product.stockPolicy,
          basePrice: product.basePrice,
          costPrice: product.costPrice,
          designName: product.designName,
          printDetails: product.printDetails,
          leadTimeDays: product.leadTimeDays,
          images: parseImageList(product.images),
          active: product.active,
          featured: product.featured,
          variants: product.variants.map((v) => ({ size: v.size, color: v.color, stockQty: v.stockQty })),
        }}
      />
    </div>
  );
}
