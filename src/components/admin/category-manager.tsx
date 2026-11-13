"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/lib/admin-actions";
import { Badge, Button, Card, Field, Input } from "@/components/ui";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  productCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setSortOrder("0");
  }

  function startEdit(category: CategoryRow) {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setSortOrder(String(category.sortOrder));
    setConfirmId(null);
    setMessage(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await saveCategory({
      id: editingId ?? undefined,
      name,
      slug,
      sortOrder: Number(sortOrder) || 0,
    });
    setBusy(false);
    setMessage({ type: result.ok ? "ok" : "err", text: result.message });
    if (result.ok) {
      resetForm();
      router.refresh();
    }
  }

  async function remove(category: CategoryRow) {
    setBusy(true);
    setMessage(null);
    const result = await deleteCategory(category.id);
    setBusy(false);
    setConfirmId(null);
    setMessage({ type: result.ok ? "ok" : "err", text: result.message });
    if (result.ok) {
      if (editingId === category.id) resetForm();
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit p-5">
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-lg font-black">{editingId ? "تعديل الفئة" : "فئة جديدة"}</h2>
          <Field label="الاسم">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="مثل: بناطيل"
            />
          </Field>
          <Field label="الرابط (اختياري)" hint="يُولَّد تلقائيًا من الاسم — يظهر في رابط الفلترة">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="pants"
            />
          </Field>
          <Field label="الترتيب" hint="الأصغر يظهر أولًا في المتجر">
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Field>

          {message ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                message.type === "ok"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء الفئة"}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={busy}>
                إلغاء
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
              <th className="px-4 py-3">الفئة</th>
              <th className="px-4 py-3">الرابط</th>
              <th className="px-4 py-3">المنتجات</th>
              <th className="px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                  لا توجد فئات بعد — أنشئ أول فئة من النموذج
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-bold">{category.name}</p>
                    <p className="text-xs text-zinc-400">ترتيب {category.sortOrder}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      /{category.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={category.productCount > 0 ? "blue" : "gray"}>
                      {category.productCount}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(category)}
                        disabled={busy}
                      >
                        تعديل
                      </Button>
                      {confirmId === category.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => remove(category)}
                            disabled={busy}
                          >
                            تأكيد الحذف
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmId(null)}
                            disabled={busy}
                          >
                            تراجع
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setConfirmId(category.id)}
                          disabled={busy || category.productCount > 0}
                          title={
                            category.productCount > 0
                              ? "انقل منتجاتها لفئة أخرى قبل الحذف"
                              : undefined
                          }
                        >
                          حذف
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          لا يمكن حذف فئة تحتوي منتجات — انقل منتجاتها لفئة أخرى أولًا.
        </p>
      </Card>
    </div>
  );
}
