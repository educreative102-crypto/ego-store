import { fetchCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { OrderForm } from "@/components/admin/order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [products, settings] = await Promise.all([fetchCatalog({ onlyActive: true, includeSoldOut: true }), getSettings()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black">طلب واتساب جديد</h1>
      <p className="text-sm text-zinc-500">
        زبون راسلك من الواتساب خارج الموقع؟ سجل طلبه هنا — بعد التأكيد يُعامل تمامًا كطلب الموقع.
      </p>
      <OrderForm products={products} settings={settings} />
    </div>
  );
}