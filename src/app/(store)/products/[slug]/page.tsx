import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { StockPolicy } from "@prisma/client";
import { fetchProductBySlug, parseImageList } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { CATEGORY_LABEL, STOCK_POLICY_LABEL } from "@/lib/labels";
import { buildWhatsAppLink, buildCustomPrintMessage } from "@/lib/whatsapp";
import { OrderButton } from "@/components/store/order-button";
import { ProductGallery } from "@/components/store/product-gallery";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return { title: "منتج غير موجود" };
  const settings = await getSettings();
  const description =
    product.description ||
    `${product.name} (${product.sku}) من ${settings.shopName} — اطلبه عبر واتساب بضغطة واحدة`;
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.mainImage ? [product.mainImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: product.mainImage ? [product.mainImage] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const settings = await getSettings();
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const images = parseImageList(product.images);
  const customPrintLink = buildWhatsAppLink(settings.whatsappNumber, buildCustomPrintMessage(settings));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            sku: product.sku,
            description: product.description || undefined,
            image: product.mainImage ? [product.mainImage] : undefined,
            offers: {
              "@type": "Offer",
              price: product.basePrice,
              priceCurrency: settings.currency,
              availability: product.allSoldOut
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
            },
          }),
        }}
      />
      <nav aria-label="مسار التنقل" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
        <Link href="/" className="rounded-full px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
          الرئيسية
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="rounded-full px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
          الكتالوج
        </Link>
        <span aria-hidden="true">/</span>
        <span className="px-2 py-1 font-bold text-zinc-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={images} name={product.name} sku={product.sku} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray">{product.sku}</Badge>
            <Badge color="orange">{CATEGORY_LABEL[product.category]}</Badge>
            <Badge color={product.stockPolicy === StockPolicy.MADE_TO_ORDER ? "orange" : "amber"}>
              {STOCK_POLICY_LABEL[product.stockPolicy]}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-black text-zinc-900">{product.name}</h1>
          {product.designName ? (
            <p className="mt-2 text-sm font-bold text-primary-strong">تصميم: {product.designName}</p>
          ) : null}
          {product.description ? <p className="mt-2 leading-relaxed text-zinc-600">{product.description}</p> : null}
          {product.printDetails ? (
            <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-sm text-zinc-700">
              <span className="font-bold text-primary-strong">عن الطباعة:</span> {product.printDetails}
            </p>
          ) : null}
          <p className="mt-4 text-3xl font-black text-zinc-900">
            {money(product.basePrice, settings.currency, settings.currencyPosition)}
          </p>

          <div className="mt-6">
            <OrderButton
              productId={product.id}
              sku={product.sku}
              basePrice={product.basePrice}
              stockPolicy={product.stockPolicy}
              variants={product.variants}
              settings={settings}
              soldOut={product.allSoldOut}
              printDesignName={product.designName || undefined}
            />
          </div>

          {product.stockPolicy === StockPolicy.MADE_TO_ORDER && customPrintLink ? (
            <div className="mt-4">
              <a
                href={customPrintLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-primary-strong/25 bg-primary-soft px-4 py-3 text-center text-sm font-bold text-primary-strong transition-colors hover:bg-primary-mist"
              >
                عندك فكرة طباعة خاصة؟ كلمنا واتساب
              </a>
            </div>
          ) : null}

          {product.stockPolicy === StockPolicy.MADE_TO_ORDER ? (
            <p className="mt-4 text-sm text-zinc-500">
              هذه القطعة تُصنع عند الطلب بمدة تحضير {settings.defaultLeadTime} — الكميات غير محدودة.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}