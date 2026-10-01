import type { ProductWithBalance } from "@/lib/catalog";
import type { AppSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/labels";
import { buildWhatsAppLink, buildQuickOrderMessage } from "@/lib/whatsapp";
import { StoreImage } from "@/components/store/store-image";
import Link from "next/link";

export function ProductCard({
  product,
  settings,
  lowStockThreshold,
}: {
  product: ProductWithBalance;
  settings: AppSettings;
  lowStockThreshold: number;
}) {
  const soldOut = product.allSoldOut;
  const stocked = product.stockPolicy === "STOCKED";

  const availableVariants = product.variants.filter((v) => v.available);
  const minRemaining =
    availableVariants.length > 0 ? Math.min(...availableVariants.map((v) => v.remaining)) : 0;
  const lowStock =
    stocked && !soldOut && minRemaining > 0 && minRemaining <= lowStockThreshold;

  const first = availableVariants[0];
  const quickLink =
    first && settings.whatsappNumber
      ? buildWhatsAppLink(
          settings.whatsappNumber,
          buildQuickOrderMessage(settings.shopName, product.name, product.sku, first.size, first.color)
        )
      : null;

  const productLink = (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      aria-label={product.name}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {product.mainImage ? (
          <StoreImage
            src={product.mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl font-black text-zinc-300">
            {product.sku}
          </div>
        )}
        {soldOut ? (
          <div className="absolute inset-0 grid place-items-center bg-zinc-900/60">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-black text-zinc-800">
              نفدت الكمية
            </span>
          </div>
        ) : null}
        <span className="absolute top-2 right-2 rounded-full bg-zinc-900/70 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
          {product.sku}
        </span>
        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600">
          {CATEGORY_LABEL[product.category]}
        </span>
        {!soldOut && stocked ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-black text-white">
            متوفر
          </span>
        ) : null}
      </div>
    </Link>
  );

  const body = (
    <div className="flex flex-1 flex-col gap-2 p-3">
      <div>
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-1 font-bold text-zinc-900 transition-colors hover:text-primary-strong"
        >
          {product.name}
        </Link>
        {product.stockPolicy === "MADE_TO_ORDER" ? (
          <p className="mt-0.5 text-xs font-semibold text-primary-strong">اطبع عند الطلب — متاح دائمًا</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-black text-zinc-900">
          {money(product.basePrice, settings.currency, settings.currencyPosition)}
        </span>
        {lowStock ? (
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-black text-primary-hover">
            بقي {minRemaining} قطع فقط
          </span>
        ) : soldOut ? null : (
          <span className="text-xs font-semibold text-zinc-500">مقاسات متوفرة</span>
        )}
      </div>

      {!soldOut && quickLink ? (
        <a
          href={quickLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
          </svg>
          اطلب فورًا
        </a>
      ) : null}
    </div>
  );

  if (soldOut) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white opacity-70">
        {productLink}
        {body}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-mist hover:shadow-lg">
      {productLink}
      {body}
    </div>
  );
}