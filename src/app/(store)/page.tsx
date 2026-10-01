import Link from "next/link";
import { fetchCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppLink, buildCustomPrintMessage } from "@/lib/whatsapp";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

const FEATURES = [
  { title: "طلب عبر واتساب", desc: "بضغطة واحدة ينتقل طلبك لمحادثة واتساب جاهزة" },
  { title: "دفع مريح", desc: "شام كاش أو عند الاستلام — اختر ما يناسبك" },
  { title: "طباعة حسب فكرتك", desc: "خام + طباعة مخصصة لأي تصميم أو عبارة" },
];

export default async function HomePage() {
  const settings = await getSettings();
  const customPrintLink = buildWhatsAppLink(settings.whatsappNumber, buildCustomPrintMessage(settings));
  const chatLink = settings.whatsappNumber
    ? buildWhatsAppLink(settings.whatsappNumber, `مرحبًا، من ${settings.shopName}`)
    : null;
  const [featured, hoodies, tshirts] = await Promise.all([
    fetchCatalog({ onlyActive: true }),
    fetchCatalog({ category: "HOODIE" }),
    fetchCatalog({ category: "TSHIRT" }),
  ]);

  const displayFeatured = featured
    .filter((p) => p.featured)
    .concat(featured.filter((p) => !p.featured))
    .slice(0, 8);

  const hoodiesAvailable = hoodies.filter((p) => !p.allSoldOut).length;
  const tshirtsAvailable = tshirts.filter((p) => !p.allSoldOut).length;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-primary-strong via-primary to-primary px-6 py-16 text-center text-white md:py-24">
        <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="mx-auto mb-4 w-fit rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold tracking-wide text-white/95 backdrop-blur">
            {settings.shopName} — أوفرسايز ستريت وير
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-black leading-tight md:text-5xl">
            هوديز وتيشيرتات أوفرسايز
            <br />
            مطبوعة، خام، أو{" "}
            <span className="underline decoration-white/50 decoration-4 underline-offset-8">
              فكرتك أنت
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
            اختر قطعتك وزينها بما يعجبك واطلبها عبر واتساب — تصل إليك جاهزة.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className="rounded-full bg-white px-7 py-3 font-black text-primary-strong shadow-md transition-transform hover:scale-[1.02]"
            >
              تسوق الآن
            </Link>
            <Link
              href="/products?recipe=MADE_TO_ORDER"
              className="rounded-full border border-white/40 px-7 py-3 font-bold text-white transition-colors hover:bg-white/10"
            >
              طلبية الطباعة
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-4 py-1.5 font-semibold text-white/95 backdrop-blur">
              شام كاش / عند الاستلام
            </span>
            <span className="rounded-full bg-white/15 px-4 py-1.5 font-semibold text-white/95 backdrop-blur">
              توصيل لعدة محافظات
            </span>
            <span className="rounded-full bg-white/15 px-4 py-1.5 font-semibold text-white/95 backdrop-blur">
              طباعة مخصصة
            </span>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-black text-zinc-900">{f.title}</p>
            <p className="mt-1 text-sm text-zinc-500">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-900">
            أحدث القطع
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-strong">
              {displayFeatured.length}
            </span>
          </h2>
          <Link href="/products" className="rounded-full px-3 py-1.5 text-sm font-bold text-primary-strong transition-colors hover:bg-primary-soft">
            عرض الكل ←
          </Link>
        </div>
        {displayFeatured.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            لا توجد منتجات بعد — أضف منتجاتك من لوحة التحكم
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {displayFeatured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                settings={settings}
                lowStockThreshold={settings.lowStockThreshold}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Link
          href="/products?category=HOODIE"
          className="group relative overflow-hidden rounded-3xl from-primary-strong to-primary bg-gradient-to-bl p-8 text-white transition-transform hover:scale-[1.01]"
        >
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-xl" />
          <p className="text-2xl font-black">الهوديز</p>
          <p className="mt-1 text-white/85">
            {hoodiesAvailable} {hoodiesAvailable === 1 ? "قطعة متوفرة" : "قطعات متوفرة"} الآن
          </p>
          <span className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-black text-primary-strong">
            تصفح الهوديز
          </span>
        </Link>
        <Link
          href="/products?category=TSHIRT"
          className="group relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white transition-transform hover:scale-[1.01]"
        >
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/5 blur-xl" />
          <p className="text-2xl font-black">تيشيرتات أوفرسايز</p>
          <p className="mt-1 text-white/80">
            {tshirtsAvailable} {tshirtsAvailable === 1 ? "قطعة متوفرة" : "قطعات متوفرة"} الآن
          </p>
          <span className="mt-5 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-black text-white transition-colors group-hover:bg-primary-strong">
            تصفح التيشيرتات
          </span>
        </Link>
      </section>

      <section className="mt-12 rounded-3xl bg-primary-soft p-8 text-center md:p-10">
        <h2 className="text-2xl font-black text-primary-hover">وما اللي ببالك؟</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
          عندك فكرة أو تصميم أو عبارة تريدها على قطعتك؟ كلمنا على الواتساب ونفذها لك.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {customPrintLink ? (
            <a
              href={customPrintLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              <WhatsAppIcon className="h-5 w-5" />
              اطبع فكرتك الخاصة
            </a>
          ) : (
            <span className="rounded-full bg-zinc-200 px-6 py-3 font-bold text-zinc-400">
              جاري تجهيز زر الطباعة
            </span>
          )}
          {chatLink ? (
            <a
              href={chatLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-primary-strong/30 px-6 py-3 font-bold text-primary-strong transition-colors hover:bg-primary-mist"
            >
              كلمنا واتساب
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}