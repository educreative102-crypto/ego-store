import { prisma } from "./prisma";

export interface RateRule {
  windowMs: number;
  max: number;
}

const MAX_CAS_ATTEMPTS = 8;
const PRUNE_EVERY = 50;
const PRUNE_AFTER_MS = 24 * 60 * 60_000;

let callsSincePrune = 0;

function pruneSoon(): void {
  callsSincePrune += 1;
  if (callsSincePrune % PRUNE_EVERY !== 0) return;
  void prisma.rateBucket
    .deleteMany({ where: { touchedAt: { lt: new Date(Date.now() - PRUNE_AFTER_MS) } } })
    .catch(() => undefined);
}

export async function rateLimitHit(key: string, rule: RateRule): Promise<boolean> {
  pruneSoon();
  const now = Date.now();

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const row = await prisma.rateBucket.findUnique({ where: { key } });

    if (!row) {
      try {
        await prisma.rateBucket.create({
          data: { key, count: 1, windowStart: new Date(now), blockedUntil: null },
        });
        return false;
      } catch (error) {
        if ((error as { code?: string })?.code === "P2002") continue;
        throw error;
      }
    }

    const blockedUntilMs = row.blockedUntil?.getTime() ?? 0;
    if (blockedUntilMs > now) return true;

    const windowExpired = row.windowStart.getTime() + rule.windowMs < now;
    const count = windowExpired ? 1 : row.count + 1;
    const blockedUntil = windowExpired
      ? null
      : count > rule.max
        ? new Date(now + rule.windowMs)
        : row.blockedUntil;

    const updated = await prisma.rateBucket.updateMany({
      where: {
        key,
        count: row.count,
        windowStart: row.windowStart,
        blockedUntil: row.blockedUntil,
      },
      data: {
        count,
        windowStart: windowExpired ? new Date(now) : row.windowStart,
        blockedUntil,
      },
    });
    if (updated.count === 1) {
      return blockedUntil !== null && blockedUntil.getTime() > now;
    }
  }

  throw new Error(`تعذّر تحديث حد المعدّل: ${key}`);
}

export async function rateLimitClear(key: string): Promise<void> {
  await prisma.rateBucket.deleteMany({ where: { key } });
}