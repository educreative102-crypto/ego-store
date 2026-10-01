import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { money, formatDate } from "@/lib/format";
import { parseImageList } from "@/lib/catalog";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/labels";
import { buildWhatsAppLink, buildInvoiceMessage } from "@/lib/whatsapp";
import { Badge, Button, Card } from "@/components/ui";
import { OrderActions } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getSettings();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, invoice: true },
  });
  if (!order) notFound();

  const invoiceWALink =
    order.invoice && order.customerPhone
      ? buildWhatsAppLink(
          order.customerPhone,
          buildInvoiceMessage(settings, order.invoice.invoiceNo, order.orderNo, order.invoice.amount)
        )
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{order.orderNo}</h1>
          <p className="text-sm text-zinc-500">
            {formatDate(order.createdAt)} — {SOURCE_LABEL[order.source]}
          </p>
        </div>
        <Badge className={ORDER_STATUS_COLOR[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <p className="font-black">الزبون</p>
              <p className="text-sm font-bold">
                {order.customerName}
                {order.customerPhone ? <span dir="ltr"> — {order.customerPhone}</span> : null}
              </p>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <p className="font-black">الدفع</p>
              <p className="text-sm font-bold">
                {PAYMENT_METHOD_LABEL[order.paymentMethod]} — {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </p>
            </div>
            {order.notes ? (
              <div className="px-5 py-3 text-sm text-zinc-600">
                <p className="mb-1 font-black">ملاحظات</p>
                {order.notes}
              </div>
            ) : null}
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
                  <th className="px-4 py-3">القطعة</th>
                  <th className="px-4 py-3">مقاس/لون</th>
                  <th className="px-4 py-3">الكمية</th>
                  <th className="px-4 py-3">سعر الوحدة</th>
                  <th className="px-4 py-3">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {parseImageList(item.product.images)[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={parseImageList(item.product.images)[0]} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : null}
                        <div>
                          <p className="font-bold">{item.product.sku} — {item.product.name}</p>
                          {item.printDetails ? (
                            <p className="text-xs text-zinc-400">الطباعة: {item.printDetails}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.size} / {item.color}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{money(item.unitPrice, settings.currency, settings.currencyPosition)}</td>
                    <td className="px-4 py-3 font-bold">
                      {money(item.unitPrice * item.quantity, settings.currency, settings.currencyPosition)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-4">
              <p className="font-black">الإجمالي</p>
              <p className="text-xl font-black">
                {money(order.totalAmount, settings.currency, settings.currencyPosition)}
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-3 font-black">إجراءات الطلب</p>
            <OrderActions orderId={order.id} status={order.status} />
          </Card>

          {order.invoice ? (
            <Card className="p-4">
              <p className="mb-2 font-black">الفاتورة</p>
              <div className="flex flex-col gap-2">
                <Link href={`/admin/invoices/${order.invoice.id}`}>
                  <Button variant="secondary" className="w-full">
                    عرض الفاتورة {order.invoice.invoiceNo}
                  </Button>
                </Link>
                {invoiceWALink ? (
                  <a href={invoiceWALink} target="_blank" rel="noopener noreferrer">
                    <Button variant="whatsapp" className="w-full">
                      إرسال الفاتورة واتساب
                    </Button>
                  </a>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}