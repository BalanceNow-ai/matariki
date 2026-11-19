/**
 * Daily retention job: deletes crew applications past deleteAfter (12 months
 * after submission, 30 days for unfinished drafts) and their CV blobs.
 * Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from "next/server";
import { constantTimeEquals, bearerToken } from "@/lib/crew/auth";
import { deleteApplication, listExpired } from "@/lib/crew/store";
import { deleteBlob } from "@/lib/crew/blob";

export const runtime = "nodejs";
export const preferredRegion = "syd1";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = bearerToken(request);
  if (!secret || !token || !constantTimeEquals(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let deleted = 0;
  const failures: string[] = [];
  // Batches of 100 until nothing expired is left (bounded so one run can't spin).
  for (let batch = 0; batch < 10; batch++) {
    const expired = await listExpired();
    if (!expired.length) break;
    for (const doc of expired) {
      try {
        const blob = doc.cvPathname || doc.cvUrl;
        if (blob) await deleteBlob(blob);
        await deleteApplication(doc._id);
        deleted++;
      } catch (error) {
        console.error(`Crew purge failed for ${doc._id}:`, error);
        failures.push(doc._id);
      }
    }
    if (failures.length) break;
  }

  return NextResponse.json({ deleted, failed: failures.length });
}
