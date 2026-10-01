import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black">الإعدادات</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}