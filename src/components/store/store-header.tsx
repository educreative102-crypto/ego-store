import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppLink, buildCustomPrintMessage } from "@/lib/whatsapp";
import { StoreNav } from "@/components/store/store-nav";
import { StoreImage } from "@/components/store/store-image";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "الكتالوج" },
  { href: "/about", label: "عن المتجر" },
  { href: "/payment", label: "طرق الدفع" },
  { href: "/shipping", label: "الشحن والتوصيل" },
];

export async function StoreHeader() {
  const settings = await getSettings();
  const customPrintLink = buildWhatsAppLink(settings.whatsappNumber, buildCustomPrintMessage(settings));

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-background/90 backdrop-blur no-print">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-full pr-1 transition-opacity hover:opacity-80">
          {settings.shopLogo ? (
            <StoreImage
              src={settings.shopLogo}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-black text-white">
              E
            </span>
          )}
          <span className="text-lg font-black tracking-tight text-zinc-900">{settings.shopName}</span>
        </Link>

        <StoreNav
          items={NAV}
          cta={customPrintLink ? { href: customPrintLink, label: "اطبع فكرتك الخاصة" } : undefined}
        />

        {customPrintLink ? (
          <a
            href={customPrintLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover md:inline-flex"
          >
            اطبع فكرتك الخاصة
          </a>
        ) : (
          <span className="hidden rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-400 md:inline-flex">
            اطبع فكرتك الخاصة
          </span>
        )}
      </div>
    </header>
  );
}