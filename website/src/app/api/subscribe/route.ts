import { NextResponse } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Basic shape check. Not a full RFC 5322 validator — that is a job for the
 * confirmation email — but enough to reject the obviously invalid, where the
 * previous check was `includes("@")` and accepted "@".
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_EMAIL_LENGTH = 254;

export async function POST(request: Request) {
  try {
    // Unauthenticated and it writes to a third-party list, so it needs a cap.
    const limit = checkRateLimit(clientKey(request), { windowMs: 60_000, max: 5 });
    if (limit.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const { email } = await request.json();

    if (
      typeof email !== "string" ||
      email.length > MAX_EMAIL_LENGTH ||
      !EMAIL_PATTERN.test(email)
    ) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.BUTTONDOWN_API_KEY;

    if (!apiKey) {
      console.error("BUTTONDOWN_API_KEY is not configured");
      return NextResponse.json(
        { error: "Newsletter service is not configured" },
        { status: 503 }
      );
    }

    const res = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: email }),
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    }

    if (res.status === 409) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    const errorBody = await res.text().catch(() => "No response body");
    console.error("Buttondown API error:", res.status, errorBody);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
