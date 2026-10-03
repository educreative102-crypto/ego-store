import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppLink, buildCustomPrintMessage } from "@/lib/whatsapp";

export async function StoreFooter() {
  const settings = await getSettings();
  const customPrintLink = buildWhatsAppLink(settings.whatsappNumber, buildCustomPrintMessage(settings));
  const whatsappLink = settings.whatsappNumber
    ? buildWhatsAppLink(settings.whatsappNumber, `مرحبًا، من ${settings.shopName}`)
    : null;

  return (
    <footer className="mt-auto border-t border-border bg-surface/60 no-print">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 text-sm text-foreground-muted md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="mb-2 text-lg font-black text-foreground">{settings.shopName}</p>
            <p className="max-w-sm leading-relaxed">
              هوديز وتيشيرتات أوفرسايز — مطبوعة، خام، وطباعة مخصصة حسب ذوقك. يُطلب كل شيء عبر واتساب بسهولة.
            </p>
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 btn-primary"
              >
                كلمنا واتساب
              </a>
            ) : null}
          </div>

          <div>
            <p className="mb-3 font-bold text-foreground">روابط سريعة</p>
            <ul className="space-y-2">
              <li><Link href="/products" className="transition-colors hover:text-primary-strong">الكتالوج</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-primary-strong">عن المتجر</Link></li>
              <li><Link href="/payment" className="transition-colors hover:text-primary-strong">طرق الدفع</Link></li>
              <li><Link href="/shipping" className="transition-colors hover:text-primary-strong">الشحن والتوصيل</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 font-bold text-foreground">تواصل معنا</p>
            <ul className="space-y-2">
              {settings.whatsappNumber ? (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-primary-strong"
                  >
                    واتساب: {settings.whatsappNumber}
                  </a>
                </li>
              ) : null}
              {settings.shamCashNumber ? <li>شام كاش: {settings.shamCashNumber}</li> : null}
              {customPrintLink ? (
                <li>
                  <a href={customPrintLink} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary-strong">
                    اطلب طباعة فكرة خاصة
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <p className="mt-8 border-t border-border-subtle pt-5 text-center text-xs text-foreground-muted">
          © {new Date().getFullYear()} {settings.shopName} — جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}