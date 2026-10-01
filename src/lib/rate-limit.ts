export interface RateRule {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  startedAt: number;
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimitHit(key: string, rule: RateRule): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { count: 1, startedAt: now, blockedUntil: 0 });
    return false;
  }
  if (bucket.blockedUntil > now) return true;
  if (bucket.startedAt + rule.windowMs < now) {
    buckets.set(key, { count: 1, startedAt: now, blockedUntil: 0 });
    return false;
  }
  bucket.count++;
  if (bucket.count > rule.max) {
    bucket.blockedUntil = now + rule.windowMs;
    return true;
  }
  return false;
}

export function rateLimitClear(key: string): void {
  buckets.delete(key);
}