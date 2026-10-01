"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncSheetsNow } from "@/lib/admin-actions";
import { Button } from "@/components/ui";

export function SyncNowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setMessage(null);
    const res = await syncSheetsNow();
    setMessage(res.message);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" onClick={go} disabled={busy}>
        {busy ? "جاري المزامنة..." : "زامن الآن مع Google Sheets"}
      </Button>
      {message ? (
        <p className={`text-sm font-semibold ${resOk(message)}`}>{message}</p>
      ) : null}
    </div>
  );
}

function resOk(m: string) {
  return m.includes("نجاح") ? "text-emerald-600" : "text-amber-600";
}