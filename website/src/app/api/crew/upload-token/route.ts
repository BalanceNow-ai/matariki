/**
 * Issues a Vercel Blob client-upload token for one CV.
 *
 * Requires a fresh Turnstile token (in the upload's clientPayload) and the
 * applicant's session token (header), and restricts the upload to PDF/DOCX,
 * 5 MB, under this application's own path in the private store.
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { CV_MAX_BYTES, CV_MIME_TYPES } from "@/lib/crew/schema";
import { isAllowedCvPathname } from "@/lib/crew/cv";
import { sessionFromRequest, verifySession } from "@/lib/crew/session";
import { verifyTurnstile } from "@/lib/crew/turnstile";
import { limit, tooMany } from "@/lib/crew/ratelimit";
import { clientIp } from "@/lib/crew/request";

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = await limit("uploadToken", ip);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds);

  const applicationId = verifySession(sessionFromRequest(request));
  if (!applicationId) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Completion webhooks are not used: the browser calls /applications/[id]/cv,
  // which re-checks the bytes, once the upload finishes.
  if (body.type !== "blob.generate-client-token") {
    return NextResponse.json({ error: "Unsupported" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let turnstileToken: string | undefined;
        try {
          turnstileToken = (JSON.parse(clientPayload ?? "{}") as { turnstileToken?: string }).turnstileToken;
        } catch {
          /* fall through to rejection */
        }
        if (!(await verifyTurnstile(turnstileToken, ip))) throw new Error("Verification failed");
        if (!isAllowedCvPathname(pathname, applicationId)) throw new Error("Invalid path");
        return {
          allowedContentTypes: [...CV_MIME_TYPES],
          maximumSizeInBytes: CV_MAX_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("CV upload token refused:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Upload not allowed" }, { status: 400 });
  }
}
