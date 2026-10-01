"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSettings, changeAdminPassword } from "@/lib/admin-actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

interface Props {
  settings: {
    shopName: string;
    shopLogo: string;
    whatsappNumber: string;
    shamCashNumber: string;
    currency: string;
    currencyPosition: string;
    defaultLeadTime: string;
    deliveryFee: number;
    lowStockThreshold: number;
    googleSheetId: string;
    googleSheetStatus: string;
    googleServiceAccountJson: string;
  };
}

export function SettingsForm({ settings }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: settings.shopName,
    shopLogo: settings.shopLogo,
    whatsappNumber: settings.whatsappNumber,
    shamCashNumber: settings.shamCashNumber,
    currency: settings.currency,
    currencyPosition: settings.currencyPosition,
    defaultLeadTime: settings.defaultLeadTime,
    deliveryFee: String(settings.deliveryFee),
    lowStockThreshold: String(settings.lowStockThreshold),
    googleSheetId: settings.googleSheetId,
    googleServiceAccountJson: settings.googleServiceAccountJson,
  });
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await saveSettings({
      shopName: form.shopName,
      shopLogo: form.shopLogo,
      whatsappNumber: form.whatsappNumber,
      shamCashNumber: form.shamCashNumber,
      currency: form.currency,
      currencyPosition: form.currencyPosition,
      defaultLeadTime: form.defaultLeadTime,
      deliveryFee: String(parseFloat(form.deliveryFee) || 0),
      lowStockThreshold: String(parseInt(form.lowStockThreshold, 10) || 5),
      googleSheetId: form.googleSheetId,
      googleServiceAccountJson: form.googleServiceAccountJson,
    });
    setBusy(false);
    setMessage({ type: res.ok ? "ok" : "err", text: res.message });
    router.refresh();
  }

  async function changePassword() {
    setBusy(true);
    setMessage(null);
    const res = await changeAdminPassword(newPassword);
    setBusy(false);
    setMessage({ type: res.ok ? "ok" : "err", text: res.message });
    if (res.ok) setNewPassword("");
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message.text}
        </p>
      ) : null}

      <Card className="p-6">
        <h2 className="mb-4 font-black">المتجر والدفع</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم المتجر">
            <Input value={form.shopName} onChange={(e) => set("shopName", e.target.value)} />
          </Field>
          <Field label="رابط الشعار">
            <Input value={form.shopLogo} onChange={(e) => set("shopLogo", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="رقم الواتساب" hint="بدونه تبقى أزرار الطلب تسجل الطلب وتظهر رسالة بدل فتح المحادثة">
            <Input value={form.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} placeholder="0961xxxxxx" dir="ltr" />
          </Field>
          <Field label="رقم شام كاش" hint="يظهر في الفواتير ورسائل الطلب">
            <Input value={form.shamCashNumber} onChange={(e) => set("shamCashNumber", e.target.value)} placeholder="09xxxxxx" dir="ltr" />
          </Field>
          <Field label="رمز العملة">
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} placeholder="$" />
          </Field>
          <Field label="مكان الرمز">
            <Select value={form.currencyPosition} onChange={(e) => set("currencyPosition", e.target.value)}>
              <option value="after">بعد الرقم (45$)</option>
              <option value="before">قبل الرقم ($45)</option>
            </Select>
          </Field>
          <Field label="مدة التجهيز (نص)" hint="تُعرض للقطع صنع عند الطلب">
            <Input value={form.defaultLeadTime} onChange={(e) => set("defaultLeadTime", e.target.value)} />
          </Field>
          <Field label="رسوم التوصيل" hint="0 = تُتفق مع الزبون">
            <Input type="number" min={0} value={form.deliveryFee} onChange={(e) => set("deliveryFee", e.target.value)} />
          </Field>
          <Field label="حد تنبيه المخزون المنخفض">
            <Input type="number" min={1} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 font-black">ربط Google Sheets</h2>
        <p className="mb-4 text-sm text-zinc-500">
          الحالة الحالية: <span className="font-bold">{settings.googleSheetStatus}</span>. راجع دليل الربط في docs/DEPLOY.md
        </p>
        <div className="grid gap-4">
          <Field label="معرف الجدول أو رابطه">
            <Input value={form.googleSheetId} onChange={(e) => set("googleSheetId", e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/... أو المعرف فقط" dir="ltr" />
          </Field>
          <Field label="مفتاح الخدمة (Service Account JSON)" hint="ألصق كامل الـ JSON — يُحفظ داخل قاعدة بياناتك">
            <Textarea value={form.googleServiceAccountJson} onChange={(e) => set("googleServiceAccountJson", e.target.value)} rows={5} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-black">تغيير كلمة المرور</h2>
        <div className="flex max-w-sm gap-2">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة مرور جديدة (6+ أحرف)" />
          <Button type="button" variant="secondary" onClick={changePassword} disabled={busy}>
            تغيير
          </Button>
        </div>
      </Card>

      <Button type="button" onClick={save} disabled={busy} size="lg">
        {busy ? "جاري الحفظ..." : "حفظ كل الإعدادات"}
      </Button>
    </div>
  );
}