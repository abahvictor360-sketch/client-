import { timingSafeEqual } from "node:crypto";

/** Constant-time string comparison for secrets (no timing leak on mismatch position). */
export function secureEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
