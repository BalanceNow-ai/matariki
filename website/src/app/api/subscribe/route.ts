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

    // In production, this would integrate with Buttondown or ConvertKit
    // For now, just simulate a successful subscription
    console.log(`New subscriber: ${email}`);

    // Example Buttondown integration:
    // const res = await fetch('https://api.buttondown.email/v1/subscribers', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ email }),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
