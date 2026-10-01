import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "تأكيد الطلب", desc: "نراجع طلبك على الواتساب ونتواصل معك للاتفاق النهائي." },
  { title: "التجهيز", desc: "تجهّز قطعتك وتطبع حسب تفاصيل طلبك." },
  { title: "التسليم", desc: "يصل طلبك إليك عبر التوصيل أو الاستلام الشخصي." },
];

export default async function ShippingPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black text-zinc-900">الشحن والتوصيل</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="font-black text-zinc-900">مدة التجهيز والتوصيل</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            القطع المتوفرة تجهّز خلال {settings.defaultLeadTime}. القطع «صنع عند الطلب» تبدأ بعد
            تأكيد طلبك.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="font-black text-zinc-900">رسوم التوصيل</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {settings.deliveryFee > 0
              ? `تُضاف رسوم ${money(settings.deliveryFee, settings.currency, settings.currencyPosition)} على طلبك وتظهر في رسالة الطلب والفاتورة.`
              : "تُتفق رسوم التوصيل حسب منطقتك عند الاستلام."}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="font-black text-zinc-900">رحلة طلبك</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary-strong">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-zinc-900">{s.title}</p>
                  <p className="text-sm text-zinc-500">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <details className="group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer font-black text-zinc-900 marker:text-primary">
            الاستلام من المتجر
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            خيار الاستلام الشخصي متاح عند التنسيق على الواتساب — نحدد معك الموعد وينتظرك طلبك جاهزًا.
          </p>
        </details>

        <details className="group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer font-black text-zinc-900 marker:text-primary">
            هل يمكن تتبع الطلب؟
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            نتابع معك عبر الواتساب في كل مرحلة: تأكيد، تجهيز، ثم إيراد رقم التوصيل ومنها ترسل لك تفاصيله.
          </p>
        </details>
      </div>
    </div>
  );
}