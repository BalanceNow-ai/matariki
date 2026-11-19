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

const SKIPPED = { skipped: "crew dataset not configured" } as const;

/** Sanity answers a query against a dataset that doesn't exist with 404 "Dataset not found". */
function isDatasetMissing(error: unknown): boolean {
  const e = error as { statusCode?: number; message?: string } | null;
  return Boolean(e && (e.statusCode === 404 || /dataset not found/i.test(e.message ?? "")));
}

function skip(reason: string) {
  console.info(`Crew purge skipped: ${reason}`);
  return NextResponse.json(SKIPPED);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = bearerToken(request);
  if (!secret || !token || !constantTimeEquals(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Until the crew feature is set up there is nothing to purge; don't fail the cron.
  if (!process.env.SANITY_CREW_WRITE_TOKEN) return skip("SANITY_CREW_WRITE_TOKEN is not set");

  let deleted = 0;
  const failures: string[] = [];
  // Batches of 100 until nothing expired is left (bounded so one run can't spin).
  for (let batch = 0; batch < 10; batch++) {
    let expired: Awaited<ReturnType<typeof listExpired>>;
    try {
      expired = await listExpired();
    } catch (error) {
      if (batch === 0 && isDatasetMissing(error)) return skip("the crew dataset does not exist");
      throw error;
    }
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
