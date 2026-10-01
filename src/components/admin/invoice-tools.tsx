"use client";

export function InvoiceTools({ whatsappUrl }: { whatsappUrl: string | null }) {
  return (
    <div className="no-print flex justify-end gap-2">
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700"
      >
        طباعة / حفظ PDF
      </button>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
        >
          إرسال واتساب
        </a>
      ) : null}
    </div>
  );
}