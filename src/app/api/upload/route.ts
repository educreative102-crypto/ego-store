import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { uploadImageFile } from "@/lib/image-store";

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  }
  const result = await uploadImageFile(file);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url });
}