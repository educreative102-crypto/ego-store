import Link from "next/link";
import { StockPolicy } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseImageList } from "@/lib/catalog";
import { money } from "@/lib/format";
import { CATEGORY_LABEL, STOCK_POLICY_LABEL } from "@/lib/labels";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { getSettings } = await import("@/lib/settings");
  const settings = await getSettings();
  const products = await prisma.product.findMany({
    include: { variants: true, _count: { select: { orderItems: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">المنتجات</h1>
        <Link href="/admin/products/new">
          <Button>+ منتج جديد</Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState title="لا توجد منتجات" description="ابدأ بإضافة أول قطعة — ستظهر في الموقع فورًا برمز مرجعي تلقائي" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
                <th className="px-4 py-3">الرمز</th>
                <th className="px-4 py-3">المنتج</th>
                <th className="px-4 py-3">الفئة</th>
                <th className="px-4 py-3">السياسة</th>
                <th className="px-4 py-3">البيع / التكلفة</th>
                <th className="px-4 py-3">المتغيرات</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-black">{p.sku}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {parseImageList(p.images)[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={parseImageList(p.images)[0]} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : null}
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-zinc-400">{p.designName || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{CATEGORY_LABEL[p.category]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={p.stockPolicy === StockPolicy.MADE_TO_ORDER ? "emerald" : "amber"}>
                      {STOCK_POLICY_LABEL[p.stockPolicy]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold">{money(p.basePrice, settings.currency, settings.currencyPosition)}</span>
                    <span className="text-xs text-zinc-400"> / {money(p.costPrice, settings.currency, settings.currencyPosition)}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{p._count.orderItems > 0 ? `${p.variants.length} مقاس/لون` : p.variants.length}</td>
                  <td className="px-4 py-3">
                    {p.active ? <Badge color="emerald">نشط</Badge> : <Badge color="rose">معطل</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <ProductRowActions
                      id={p.id}
                      href={`/admin/products/${p.id}`}
                      active={p.active}
                      hasOrders={p._count.orderItems > 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}