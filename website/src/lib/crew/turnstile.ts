/**
 * Cloudflare Turnstile verification.
 *
 * In production a missing TURNSTILE_SECRET_KEY fails closed. In development
 * it is skipped with a warning so the form can be exercised locally.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("TURNSTILE_SECRET_KEY is not set; refusing crew submissions");
      return false;
    }
    console.warn("TURNSTILE_SECRET_KEY is not set; skipping Turnstile outside production");
    return true;
  }
  if (!token || token.length > 4096) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}
