/**
 * Admin-only CV download: redirects to a five-minute signed URL.
 */
import { NextResponse } from "next/server";
import { authenticateAdmin, unauthorized } from "@/lib/crew/auth";
import { getApplication } from "@/lib/crew/store";
import { signedDownloadUrl } from "@/lib/crew/blob";

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authenticateAdmin(request))) return unauthorized();
  const { id } = await params;

  const app = await getApplication(id);
  if (!app?.cv?.pathname) return NextResponse.json({ error: "No CV" }, { status: 404 });

  const url = await signedDownloadUrl(app.cv.pathname);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
