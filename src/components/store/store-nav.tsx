"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const pill = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
    active
      ? "bg-primary-soft text-primary-strong"
      : "text-zinc-600 hover:bg-primary-soft hover:text-primary-strong"
  }`;

export function StoreNav({
  items,
  cta,
}: {
  items: NavItem[];
  cta?: { href: string; label: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={pill(isActive(pathname, item.href))}>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-label="فتح القائمة"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-700 transition-colors hover:bg-zinc-50 md:hidden"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-zinc-200 bg-white px-4 pb-4 pt-2 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-2xl px-4 py-3 text-base font-bold transition-colors ${
                  isActive(pathname, item.href)
                    ? "bg-primary-soft text-primary-strong"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {cta ? (
              <a
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-2xl bg-primary px-4 py-3 text-center text-base font-black text-white transition-colors hover:bg-primary-hover"
              >
                {cta.label}
              </a>
            ) : (
              <span className="mt-2 rounded-2xl bg-zinc-100 px-4 py-3 text-center text-base font-bold text-zinc-400">
                جاري تجهيز زر الطباعة
              </span>
            )}
          </nav>
        </div>
      ) : null}
    </>
  );
}