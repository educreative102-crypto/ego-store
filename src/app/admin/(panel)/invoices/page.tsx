import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { money, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/labels";
import { Badge, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const settings = await getSettings();
  const invoices = await prisma.invoice.findMany({
    include: { order: true },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">الفواتير</h1>
      {invoices.length === 0 ? (
        <EmptyState title="لا فواتير بعد" description="تُصدر الفواتير تلقائيًا عند تأكيد الطلبات" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
                <th className="px-4 py-3">رقم الفاتورة</th>
                <th className="px-4 py-3">الطلب</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الزبون</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">حالة الطلب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/invoices/${inv.id}`} className="font-black hover:underline">
                      {inv.invoiceNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${inv.order.id}`} className="font-bold text-zinc-600 hover:underline">
                      {inv.order.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDateTime(inv.issuedAt)}</td>
                  <td className="px-4 py-3">{inv.order.customerName}</td>
                  <td className="px-4 py-3 font-black">
                    {money(inv.amount, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_STATUS_COLOR[inv.order.status]}>{ORDER_STATUS_LABEL[inv.order.status]}</Badge>
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