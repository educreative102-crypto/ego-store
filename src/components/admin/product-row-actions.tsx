"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleProductActive, deleteProduct } from "@/lib/admin-actions";
import { Button } from "@/components/ui";

export function ProductRowActions({
  id,
  href,
  active,
  hasOrders,
}: {
  id: string;
  href: string;
  active: boolean;
  hasOrders: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    const res = await toggleProductActive(id);
    setMessage(res.message);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("تأكيد حذف المنتج نهائيًا؟")) return;
    setBusy(true);
    setMessage(null);
    const res = await deleteProduct(id);
    setMessage(res.message);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <a href={href} className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-200">
        تعديل
      </a>
      <Button variant="ghost" size="sm" onClick={toggle} disabled={busy}>
        {active ? "تعطيل" : "تفعيل"}
      </Button>
      {!hasOrders ? (
        <Button variant="ghost" size="sm" onClick={remove} disabled={busy} className="text-rose-600">
          حذف
        </Button>
      ) : null}
      {message ? <span className="sr-only">{message}</span> : null}
    </div>
  );
}