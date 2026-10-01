"use server";

import { redirect } from "next/navigation";
import { loginAdmin, clearSession } from "./auth";

export async function loginAction(plain: string): Promise<{ ok: boolean; message?: string }> {
  const ok = await loginAdmin(plain);
  if (ok) redirect("/admin");
  return { ok: false, message: "كلمة المرور غير صحيحة" };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
}