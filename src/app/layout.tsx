import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EGO Store — هوديز و أوفرسايز",
    template: "%s | EGO Store",
  },
  description:
    "متجر هوديز وتيشيرتات أوفرسايز — مطبوعة وخام وطباعة مخصصة حسب ذوقك, تُطلب عبر واتساب بسهولة.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="flex min-h-[100dvh] flex-col bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}