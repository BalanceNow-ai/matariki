import { Header } from "@/components/layout";
import { LiveTracker } from "@/components/tracking/LiveTracker";
import { client, fetchOptions } from "@/sanity/client";
import { LATEST_POSITION_QUERY } from "@/sanity/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track",
  description:
    "Track the live position of Matariki III as we sail around New Zealand and the Pacific.",
};

// Fallback position when no data is available
const FALLBACK_POSITION = {
  lat: -36.428167,
  lng: 174.819036,
  updated: "Nov 8, 2025, 9:08 PM",
  location: "Kawau Island",
  region: "Auckland Region, NZ",
};

const SAILLOGGER_URL = "https://saillogger.com/svmatariki-iii";

type SanityPosition = {
  _id: string;
  coordinates?: { lat: number; lng: number };
  timestamp?: string;
  locationName?: string;
} | null;

export default async function TrackPage() {
  let sanityPosition: SanityPosition = null;

  try {
    sanityPosition = await client.fetch<SanityPosition>(LATEST_POSITION_QUERY, {}, fetchOptions);
  } catch (error) {
    console.error("Failed to fetch position from Sanity:", error);
  }

  // Build fallback from Sanity data or use defaults
  const fallback = {
    lat: sanityPosition?.coordinates?.lat ?? FALLBACK_POSITION.lat,
    lng: sanityPosition?.coordinates?.lng ?? FALLBACK_POSITION.lng,
    location: sanityPosition?.locationName ?? FALLBACK_POSITION.location,
    region: FALLBACK_POSITION.region,
    updated: sanityPosition?.timestamp
      ? new Date(sanityPosition.timestamp).toLocaleDateString("en-NZ", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : FALLBACK_POSITION.updated,
  };

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col">
        <LiveTracker fallback={fallback} sailloggerUrl={SAILLOGGER_URL} />
      </main>
    </>
  );
}
