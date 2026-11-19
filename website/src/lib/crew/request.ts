import { createHash } from "node:crypto";
import { clientKey } from "@/lib/rate-limit";

export { clientKey as clientIp };

/**
 * Salted SHA-256 of the client IP, stored as evidence of consent without
 * keeping the address itself. The salt is the session secret so hashes can't
 * be reversed with a precomputed table of IPv4 addresses.
 */
export function hashIp(ip: string): string {
  const salt = process.env.CREW_SESSION_SECRET ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Body too large");
  return JSON.parse(text);
}
