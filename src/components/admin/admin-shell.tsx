"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui";

const MENU = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/products", label: "المنتجات" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/invoices", label: "الفواتير" },
  { href: "/admin/reports", label: "التقارير" },
  { href: "/admin/settings", label: "الإعدادات" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex min-h-[100dvh] bg-zinc-100">
      <aside className="no-print hidden w-56 shrink-0 flex-col border-l border-zinc-200 bg-white md:flex">
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-sm font-black text-white">E</span>
          <span className="font-black">لوحة التحكم</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                isActive(item.href)
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <Button variant="ghost" className="w-full" onClick={() => logoutAction()}>
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
          <span className="font-black">لوحة التحكم</span>
          <button onClick={() => logoutAction()} className="text-sm font-bold text-zinc-500">
            خروج
          </button>
        </div>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}