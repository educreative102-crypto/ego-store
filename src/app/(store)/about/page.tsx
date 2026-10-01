import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const VALUES = [
  {
    title: "خامات جيدة",
    desc: "قطع أوفرسايز تُلبس وتُشبع وفاؤها — نختار الأقمشة بعناية لتدوم.",
  },
  {
    title: "رمز لكل قطعة",
    desc: "كل قطعة تحمل رمز EGO-XXX يربط موقعنا بواتساب والفواتير، فطلبك دائمًا في متناول اليد.",
  },
  {
    title: "تعامل مباشر",
    desc: "لا وسيط ولا آلة — كلام مباشر معنا على واتساب من لحظة الطلب حتى الاستلام.",
  },
];

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black text-zinc-900">عن {settings.shopName}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-zinc-700">
        <p>
          {settings.shopName} متجر متخصص بالهوديز والتيشيرتات الأوفرسايز — قطع مطبوعة بخامات
          جيدة، وخام للطباعة حسب ذوقك، وطباعة مخصصة لفكرتك أنت.
        </p>
        <p>
          كل قطعة لدينا مرقمة برمز مرجعي خاص (مثل EGO-001) لتسهيل طلبها وبيان كميتها، ونعتمد
          على الواتساب في استقبال الطلبات والدفع عبر شام كاش أو عند الاستلام.
        </p>
        <p>نشحن لعدة محافظات، وتجد تفاصيل الدفع والشحن في صفحتيهما المخصصتين.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="mt-3 font-black text-zinc-900">{v.title}</p>
            <p className="mt-1 text-sm text-zinc-500">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}