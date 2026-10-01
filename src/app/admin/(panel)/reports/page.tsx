import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { money, formatDateTime } from "@/lib/format";
import { profit, profitMargin } from "@/lib/inventory";
import { aggregateSoldItems, type ProductAggregate, type SoldLine } from "@/lib/report-aggregates";
import { Badge, Card } from "@/components/ui";
import { SyncNowButton } from "@/components/admin/sync-now-button";

export const dynamic = "force-dynamic";

const SOLD = [OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
const SOLD_STATUSES_SQL = Prisma.raw("'CONFIRMED','PAID','SHIPPED','DELIVERED'");

interface AggRow {
  productId: string;
  qty: number;
  revenue: number;
  cost: number;
}

interface TopProduct {
  sku: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
}

interface TopSales {
  counts: Map<string, ProductAggregate>;
  unitCostAvailable: boolean;
}

const soldItemsWhere = { order: { status: { in: SOLD } } };

async function soldLinesWithCost(): Promise<{ lines: SoldLine[]; unitCostAvailable: boolean }> {
  try {
    const lines = await prisma.orderItem.findMany({
      where: soldItemsWhere,
      select: { productId: true, quantity: true, unitPrice: true, unitCost: true },
    });
    return { lines, unitCostAvailable: true };
  } catch (error) {
    console.error("تعذّرت قراءة تكلفة القطع — ارتداد إلى الإيراد فقط:", error);
    const lines = await prisma.orderItem.findMany({
      where: soldItemsWhere,
      select: { productId: true, quantity: true, unitPrice: true },
    });
    return { lines: lines.map((line) => ({ ...line, unitCost: 0 })), unitCostAvailable: false };
  }
}

async function aggregateTopSales(): Promise<TopSales> {
  try {
    const rows = await prisma.$queryRaw<AggRow[]>`
      SELECT "OrderItem"."productId" AS "productId",
             CAST(SUM("OrderItem"."quantity") AS INTEGER) AS "qty",
             COALESCE(SUM("OrderItem"."quantity" * "OrderItem"."unitPrice"), 0) AS "revenue",
             COALESCE(SUM("OrderItem"."quantity" * "OrderItem"."unitCost"), 0) AS "cost"
      FROM "OrderItem"
      INNER JOIN "Order" ON "Order"."id" = "OrderItem"."orderId"
      WHERE "Order"."status" IN (${SOLD_STATUSES_SQL})
      GROUP BY "OrderItem"."productId"
    `;
    if (Array.isArray(rows)) {
      return {
        counts: new Map(
          rows.map((r) => [
            r.productId,
            { qty: Number(r.qty) || 0, revenue: Number(r.revenue) || 0, cost: Number(r.cost) || 0 },
          ])
        ),
        unitCostAvailable: true,
      };
    }
  } catch (error) {
    console.error("فشل التجميع عبر SQL — ارتداد إلى تجميع Prisma:", error);
  }
  const { lines, unitCostAvailable } = await soldLinesWithCost();
  return { counts: aggregateSoldItems(lines), unitCostAvailable };
}

async function loadTopProducts(): Promise<{ products: TopProduct[]; unitCostAvailable: boolean }> {
  const { counts, unitCostAvailable } = await aggregateTopSales();
  if (counts.size === 0) return { products: [], unitCostAvailable };
  const products = await prisma.product.findMany({
    where: { id: { in: [...counts.keys()] } },
    select: { id: true, sku: true, name: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const top: TopProduct[] = [...counts.entries()]
    .map(([productId, a]) => ({
      sku: productById.get(productId)?.sku ?? "مجهول",
      name: productById.get(productId)?.name ?? "مجهول",
      qty: a.qty,
      revenue: a.revenue,
      cost: a.cost,
    }))
    .sort((a, b) => b.qty - a.qty);
  return { products: top, unitCostAvailable };
}

export default async function ReportsPage() {
  const settings = await getSettings();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [soldOrders, monthOrders, topSales] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: [...SOLD, OrderStatus.CANCELLED] } },
      select: { status: true, totalAmount: true, totalCost: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: startOfMonth }, status: { in: SOLD } },
      select: { totalAmount: true, totalCost: true },
    }),
    loadTopProducts(),
  ]);

  const topProducts = topSales.products;

  const activeSold = soldOrders.filter((o) => o.status !== OrderStatus.CANCELLED);
  const totalRevenue = activeSold.reduce((s, o) => s + o.totalAmount, 0);
  const totalCost = activeSold.reduce((s, o) => s + o.totalCost, 0);
  const totalProfit = profit(totalRevenue, totalCost);
  const totalMargin = profitMargin(totalRevenue, totalCost);

  const monthRevenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const monthCost = monthOrders.reduce((s, o) => s + o.totalCost, 0);

  const stats = [
    { label: "إجمالي الإيرادات", value: money(totalRevenue, settings.currency, settings.currencyPosition) },
    { label: "إجمالي التكلفة", value: money(totalCost, settings.currency, settings.currencyPosition) },
    { label: "صافي الربح", value: money(totalProfit, settings.currency, settings.currencyPosition) },
    { label: "نسبة الربح", value: `${totalMargin}%` },
    { label: `إيراد الشهر ${settings.currency}`, value: monthRevenue.toFixed(2) },
    { label: `ربح الشهر ${settings.currency}`, value: profit(monthRevenue, monthCost).toFixed(2) },
  ];

  const sheetConfigured = Boolean(
    settings.googleServiceAccountJson.trim() && settings.googleSheetId.trim()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">التقارير</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm font-semibold text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-black">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">أكثر القطع مبيعًا</h2>
          </div>
          {!topSales.unitCostAvailable ? (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              تكاليف القطع غير متاحة في قاعدة البيانات — الأرقام المعروضة للإيراد فقط.
            </p>
          ) : null}
          {topProducts.length === 0 ? (
            <p className="text-sm text-zinc-500">لا مبيعات بعد</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {topProducts.map((p) => (
                <li key={p.sku} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-bold">{p.sku}</span>
                    <span className="mr-1 text-zinc-600">{p.name}</span>
                    <span className="mr-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold">{p.qty}</span>
                  </div>
                  <span className="font-bold">
                    {money(p.revenue, settings.currency, settings.currencyPosition)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">مزامنة Google Sheets</h2>
            <Badge color={sheetConfigured ? "emerald" : "amber"}>{settings.googleSheetStatus}</Badge>
          </div>
          {sheetConfigured ? (
            <p className="mb-3 text-sm text-zinc-600">
              التبويبات الأربعة (الجرد، المبيعات، الفواتير، الأرباح) تُحدَّث بكل عملية بيع أو إلغاء.
              <br />
              آخر مزامنة: {formatDateTime(settings.lastSyncAt)}
            </p>
          ) : (
            <p className="mb-3 text-sm text-zinc-600">
              غير مربوط بعد — ربط الجدول من الإعدادات. بدون ربط، يعمل المتجر والجرد والفواتير بشكل طبيعي، وتُتجاهل المزامنة بصمت.
            </p>
          )}
          <SyncNowButton />
        </Card>
      </div>
    </div>
  );
}