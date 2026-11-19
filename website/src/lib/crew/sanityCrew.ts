/**
 * Server-only Sanity client for the PRIVATE `crew` dataset.
 *
 * Applications contain personal data. They are never read through the public
 * client in `@/sanity/client` (which has no token and targets `production`),
 * never through the CDN, and this module refuses to load in a browser bundle.
 */
import "server-only";
import { createClient, type SanityClient } from "@sanity/client";
import { projectId } from "@/sanity/client";

let cached: SanityClient | null = null;

export function crewDataset(): string {
  return process.env.SANITY_CREW_DATASET || "crew";
}

export function getCrewClient(): SanityClient {
  if (cached) return cached;
  const token = process.env.SANITY_CREW_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_CREW_WRITE_TOKEN is not configured");
  const dataset = crewDataset();
  if (dataset === (process.env.NEXT_PUBLIC_SANITY_DATASET || "production")) {
    // A misconfiguration here would put applications in the public dataset.
    throw new Error("SANITY_CREW_DATASET must not be the public dataset");
  }
  cached = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  return cached;
}

/** Test hook. */
export function setCrewClientForTests(client: SanityClient | null): void {
  cached = client;
}
