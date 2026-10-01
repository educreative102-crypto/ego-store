import { compare } from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { ensureAdminPassword } from "./settings";
import { rateLimitClear, rateLimitHit } from "./rate-limit";

const SESSION_COOKIE = "ego_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const LOGIN_LIMIT = { windowMs: 15 * 60_000, max: 5 };

let devSecret: string | null = null;

function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET غير معرف — اضبطه في متغيرات بيئة الإنتاج");
  }
  if (!devSecret) devSecret = randomBytes(32).toString("base64url");
  return devSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function setSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return Boolean(token && verifySessionToken(token));
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loginAdmin(plain: string): Promise<boolean> {
  const key = `login:${await clientIp()}`;
  if (rateLimitHit(key, LOGIN_LIMIT)) return false;
  await ensureAdminPassword();
  const row = await prisma.setting.findUnique({ where: { key: "adminPasswordHash" } });
  if (!row?.value) return false;
  const ok = await compare(plain, row.value);
  if (ok) {
    rateLimitClear(key);
    await setSession();
  }
  return ok;
}