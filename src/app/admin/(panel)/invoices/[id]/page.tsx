import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { money, formatDate } from "@/lib/format";
import {
  PAYMENT_METHOD_LABEL,
  SOURCE_LABEL,
} from "@/lib/labels";
import { buildWhatsAppLink, buildInvoiceMessage } from "@/lib/whatsapp";
import { InvoiceTools } from "@/components/admin/invoice-tools";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getSettings();
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { order: { include: { items: { include: { product: true } } } } },
  });
  if (!invoice) notFound();

  const { order } = invoice;
  const whatsappUrl = order.customerPhone
    ? buildWhatsAppLink(
        order.customerPhone,
        buildInvoiceMessage(settings, invoice.invoiceNo, order.orderNo, invoice.amount)
      )
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <InvoiceTools whatsappUrl={whatsappUrl} />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-start justify-between border-b-2 border-zinc-900 bg-zinc-950 px-8 py-6 text-white">
          <div>
            <p className="text-2xl font-black">{settings.shopName}</p>
            {settings.shopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.shopLogo} alt="" className="mt-2 h-10 w-10 rounded-full object-cover" />
            ) : null}
          </div>
          <div className="text-left">
            <p className="text-xs text-zinc-400">فاتورة</p>
            <p className="text-xl font-black" dir="ltr">{invoice.invoiceNo}</p>
          </div>
        </div>

        <div className="grid gap-6 px-8 py-6 text-sm md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-bold text-zinc-400">بيانات الزبون</p>
            <p className="font-black">{order.customerName}</p>
            {order.customerPhone ? <p dir="ltr">{order.customerPhone}</p> : null}
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-zinc-400">رقم الطلب</p>
            <p className="font-black" dir="ltr">{order.orderNo}</p>
            <p className="text-xs text-zinc-500">المصدر: {SOURCE_LABEL[order.source]}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-zinc-400">التاريخ</p>
            <p className="font-black">{formatDate(invoice.issuedAt)}</p>
            <p className="text-xs text-zinc-500">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          </div>
        </div>

        <div className="px-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
                <th className="py-2">القطعة</th>
                <th className="py-2">م/لون</th>
                <th className="py-2">الكمية</th>
                <th className="py-2">السعر</th>
                <th className="py-2 text-left">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5">
                    <span className="font-bold">{item.product.sku}</span>
                    <span className="mr-1">{item.product.name}</span>
                    {item.printDetails ? (
                      <span className="block text-xs text-zinc-400">الطباعة: {item.printDetails}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5">{item.size}/{item.color}</td>
                  <td className="py-2.5">{item.quantity}</td>
                  <td className="py-2.5">{money(item.unitPrice, settings.currency, settings.currencyPosition)}</td>
                  <td className="py-2.5 text-left font-bold">
                    {money(item.unitPrice * item.quantity, settings.currency, settings.currencyPosition)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t-2 border-zinc-900 bg-zinc-50 px-8 py-5">
          <div>
            <p className="font-black">الإجمالي</p>
            {settings.deliveryFee > 0 ? (
              <p className="text-xs text-zinc-500">شامل رسوم التوصيل {money(settings.deliveryFee, settings.currency, settings.currencyPosition)}</p>
            ) : null}
          </div>
          <p className="text-2xl font-black">
            {money(invoice.amount, settings.currency, settings.currencyPosition)}
          </p>
        </div>

        <div className="px-8 py-6 text-sm">
          {settings.shamCashNumber ? (
            <p className="rounded-lg bg-zinc-100 px-4 py-3">
              <span className="font-black">الدفع:</span> تحويل شام كاش <b dir="ltr">{settings.shamCashNumber}</b> أو الدفع عند الاستلام.
            </p>
          ) : (
            <p className="rounded-lg bg-zinc-100 px-4 py-3">الدفع: عند الاستلام أو عبر شام كاش.</p>
          )}
          <p className="mt-4 text-center text-xs text-zinc-400">
            شكرًا لثقتك بمتجر {settings.shopName}
            <br />
            <span className="text-[10px]">تخضع هذه الفاتورة لشروط المتجر — تحفظ نسخة منها لدى الطرفين.</span>
          </p>
        </div>
      </div>
    </div>
  );
}