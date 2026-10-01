import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { syncSheets } from "@/lib/sheets/sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearerOk = authHeader === `Bearer ${process.env.AUTH_SECRET || ""}`;
  if (!(await isAdmin()) && !bearerOk) {
    return NextResponse.json({ ok: false, message: "غير مصرح" }, { status: 401 });
  }
  const result = await syncSheets();
  return NextResponse.json(result);
}