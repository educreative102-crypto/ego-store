"use client";

import { useState } from "react";
import { loginAction } from "@/lib/auth-actions";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await loginAction(password);
    if (!res.ok) setError(res.message ?? "كلمة المرور غير صحيحة");
    setBusy(false);
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-xl"
      >
        <div className="text-center">
          <h1 className="text-2xl font-black">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-zinc-500">سجّل دخولك للمتابعة</p>
        </div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          autoFocus
          required
        />
        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
    </div>
  );
}