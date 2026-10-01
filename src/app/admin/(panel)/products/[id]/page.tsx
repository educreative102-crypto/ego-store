import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseImageList } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black">
        تعديل {product.name} <span className="text-zinc-400">({product.sku})</span>
      </h1>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
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