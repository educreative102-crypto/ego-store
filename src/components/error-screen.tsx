"use client";

import Link from "next/link";
import { useEffect } from "react";

export function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="text-2xl font-black text-zinc-900">حدث خطأ غير متوقع</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        اعتذر عن هذا الاضطراب. أعد المحاولة الآن، وإن تكرر الخطأ فأعد لاحقًا.
      </p>
      {reset ? (
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-700"
        >
          إعادة المحاولة
        </button>
      ) : (
        <Link
          href="/"
          className="mt-6 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-700"
        >
          العودة للرئيسية
        </Link>
      )}
    </div>
  );
}