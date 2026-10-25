import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();

/** Constant-time comparison of SHA-256 digests (equal length, no early exit). */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export function authConfigured(): boolean {
  return Boolean(process.env.DEMO_USERNAME && process.env.DEMO_PASSWORD && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.DEMO_USERNAME;
  const p = process.env.DEMO_PASSWORD;
  if (!u || !p) return false;
  // evaluate both so timing does not reveal which field was wrong
  const okU = safeEqual(username, u);
  const okP = safeEqual(password, p);
  return okU && okP;
}
