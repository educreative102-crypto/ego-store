import { put } from "@vercel/blob";

export async function uploadImageFile(file: File): Promise<{ url?: string; error?: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "التخزين السحابي للصور غير مهيأ — استخدم رابط صورة خارجي أو اضبط BLOB_READ_WRITE_TOKEN" };
  }
  if (!file || file.size === 0) {
    return { error: "الصورة فارغة" };
  }
  const MAX_SIZE = 4 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { error: "الصورة أكبر من 4MB" };
  }
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const blob = await put(`products/${Date.now()}-${safeName}`, file, {
      access: "public",
    });
    return { url: blob.url };
  } catch {
    return { error: "فشل رفع الصورة" };
  }
}