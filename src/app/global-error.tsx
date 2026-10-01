"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#ffffff",
          color: "#18181b",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <main>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#09090b" }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ marginTop: 8, fontSize: "0.875rem", color: "#71717a" }}>
            اعتذر عن هذا الاضطراب. أعد المحاولة الآن، وإن تكرر الخطأ فأعد لاحقًا.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              background: "#18181b",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}