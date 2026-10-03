import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { drainSheetsSync } from "@/lib/sheets/sync";

export const dynamic = "force-dynamic";

function bearerOk(req: NextRequest): boolean {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin()) && !bearerOk(req)) {
    return NextResponse.json({ ok: false, message: "غير مصرح" }, { status: 401 });
  }
  const result = await drainSheetsSync();
  return NextResponse.json(result);
}