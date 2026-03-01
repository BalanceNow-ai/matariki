import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
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
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    }

    const data = await res.json();

    if (res.status === 409) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    console.error("Buttondown API error:", res.status, data);
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
