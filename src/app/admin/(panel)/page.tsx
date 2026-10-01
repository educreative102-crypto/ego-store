import Link from "next/link";
import { OrderStatus, StockPolicy } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/labels";
import { Badge, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const SOLD = [OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export default async function DashboardPage() {
  const settings = await getSettings();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [ordersToday, pendingOrders, monthOrders, recentOrders, products] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) } } }),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.order.findMany({
      where: { createdAt: { gte: startOfMonth }, status: { in: [...SOLD] } },
      select: { totalAmount: true, totalCost: true },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.product.findMany({
      where: { stockPolicy: StockPolicy.STOCKED },
      include: { variants: true },
    }),
  ]);

  const monthRevenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const monthCost = monthOrders.reduce((s, o) => s + o.totalCost, 0);
  const monthProfit = monthRevenue - monthCost;

  // low stock: product with any stocked variant where stockQty - confirmed < threshold
  const confirmedAgg = await prisma.orderItem.groupBy({
    by: ["productId", "size", "color"],
    where: { order: { status: { in: SOLD } } },
    _sum: { quantity: true },
  });
  const aggKey = new Map<string, number>();
  for (const a of confirmedAgg) aggKey.set(`${a.productId}|${a.size}|${a.color}`, a._sum.quantity ?? 0);

  const lowStock: { sku: string; name: string; size: string; color: string; remaining: number }[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const confirmed = aggKey.get(`${p.id}|${v.size}|${v.color}`) ?? 0;
      const remainingQty = v.stockQty - confirmed;
      if (remainingQty < settings.lowStockThreshold) {
        lowStock.push({ sku: p.sku, name: p.name, size: v.size, color: v.color, remaining: remainingQty });
      }
    }
  }

  const stats = [
    { label: "طلبات اليوم", value: String(ordersToday) },
    { label: "بانتظار التأكيد", value: String(pendingOrders) },
    { label: `إيراد الشهر ${settings.currency}`, value: String(monthRevenue.toFixed(2)) },
    { label: `ربح الشهر ${settings.currency}`, value: String(monthProfit.toFixed(2)) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">الرئيسية</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm font-semibold text-zinc-500">{s.label}</p>
            <p className="mt-1 text-3xl font-black">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">أحدث الطلبات</h2>
            <Link href="/admin/orders" className="text-sm font-bold text-zinc-500 hover:text-zinc-900">
              كل الطلبات ←
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState title="لا طلبات بعد" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-zinc-50">
                    <div>
                      <span className="font-bold">{o.orderNo}</span>
                      <span className="mr-2 text-zinc-500">{o.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">{formatDateTime(o.createdAt)}</span>
                      <Badge className={ORDER_STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-black">تنبيهات المخزون المنخفض (أقل من {settings.lowStockThreshold})</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-zinc-500">لا توجد تنبيهات — المخزون جيد</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((item, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm">
                  <span className="font-bold">{item.sku} — {item.name}</span>
                  <span className="text-rose-700">
                    {item.size}/{item.color} → متبقي {item.remaining}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}