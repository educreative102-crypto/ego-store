import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black text-zinc-900">طرق الدفع</h1>
      <p className="mt-1 text-sm text-zinc-500">اختر الطريقة الأنسب لك واسحب ببساطة</p>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft font-black text-primary-strong">
              ١
            </span>
            <h2 className="font-black text-zinc-900">التحويل عبر شام كاش</h2>
          </div>
          {settings.shamCashNumber ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              حوِّل المبلغ إلى رقم:{" "}
              <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-black text-primary-strong" dir="ltr">
                {settings.shamCashNumber}
              </span>
              <br />
              بعد التحويل أرسل صورة الإيصال على الواتساب لتثبيت طلبك.
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">رقم شام كاش سيُضاف قريبًا.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft font-black text-primary-strong">
              ٢
            </span>
            <h2 className="font-black text-zinc-900">الدفع عند الاستلام</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            ادفع نقدًا عند وصول طلبك إليك — مريح وآمن ولا يسبقك أي تحويل.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft font-black text-primary-strong">
              ٣
            </span>
            <h2 className="font-black text-zinc-900">ما رسوم التوصيل؟</h2>
          </div>
          {settings.deliveryFee > 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              يضاف {money(settings.deliveryFee, settings.currency, settings.currencyPosition)} على
              الطلب ويظهر في رسالة الطلب والفاتورة.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              تُتفق رسوم التوصيل حسب منطقتك عند تأكيد الطلب.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}