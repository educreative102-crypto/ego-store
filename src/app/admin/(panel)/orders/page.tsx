import Link from "next/link";
import { OrderSource, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { money, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, SOURCE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { Badge, Button, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = Object.values(OrderStatus);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; q?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const status = STATUS_FILTERS.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const source = params.source === OrderSource.SITE || params.source === OrderSource.WHATSAPP ? params.source : undefined;
  const q = params.q?.trim();

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(q ? { OR: [{ orderNo: { contains: q } }, { customerName: { contains: q } }] } : {}),
    },
    include: { items: { include: { product: true } }, invoice: true },
    orderBy: { createdAt: "desc" },
  });

  const filterBase = (s?: string, src?: string) => {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (src) sp.set("source", src);
    const qs = sp.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-bold transition-colors ${active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">الطلبات</h1>
        <Link href="/admin/orders/new">
          <Button>+ طلب واتساب جديد</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={filterBase(undefined, undefined)} className={pill(!status && !source)}>الكل</Link>
        {STATUS_FILTERS.map((s) => (
          <Link key={s} href={filterBase(s, source)} className={pill(status === s)}>
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
        <span className="mx-1 w-px bg-zinc-300" />
        <Link href={filterBase(status, "WHATSAPP")} className={pill(source === "WHATSAPP")}>واتساب</Link>
        <Link href={filterBase(status, "SITE")} className={pill(source === "SITE")}>الموقع</Link>
      </div>

      <form method="get" className="flex max-w-sm gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="ابحث برقم الطلب أو اسم الزبون..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white">بحث</button>
      </form>

      {orders.length === 0 ? (
        <EmptyState title="لا توجد طلبات مطابقة" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
                <th className="px-4 py-3">رقم الطلب</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الزبون</th>
                <th className="px-4 py-3">المصدر</th>
                <th className="px-4 py-3">الأصناف</th>
                <th className="px-4 py-3">الإجمالي</th>
                <th className="px-4 py-3">الدفع</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-black">
                    <Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.orderNo}</Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{o.customerName}</p>
                    {o.customerPhone ? <p className="text-xs text-zinc-400" dir="ltr">{o.customerPhone}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={o.source === OrderSource.WHATSAPP ? "amber" : "blue"}>{SOURCE_LABEL[o.source]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-zinc-600">{o.items.length} صنف</span>
                    <span className="mr-2 text-xs text-zinc-400">
                      {o.items.slice(0, 2).map((it) => it.product.sku).join("، ")}
                      {o.items.length > 2 ? " ..." : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black">
                    {money(o.totalAmount, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-zinc-500">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
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