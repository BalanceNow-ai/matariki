import { Header } from "@/components/layout";
import { LiveTracker } from "@/components/tracking/LiveTracker";
import { client, fetchOptions, projectId, dataset } from "@/sanity/client";
import {
  LATEST_POSITION_QUERY,
  ACTIVE_VOYAGE_QUERY,
  VOYAGES_FOR_SELECTOR_QUERY,
  LOG_ENTRIES_WITH_COORDS_QUERY,
} from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import type { Metadata } from "next";
import type { Voyage } from "@/components/tracking/VoyageContextPanel";
import type { LogEntryWaypoint } from "@/components/map/OpenSeaMap";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

export const metadata: Metadata = {
  title: "Track",
  description:
    "Track the live position of Matariki III as we sail around New Zealand and the Pacific.",
};

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

// Fallback position when no data is available
const FALLBACK_POSITION = {
  lat: -36.428167,
  lng: 174.819036,
  updated: "Nov 8, 2025, 9:08 PM",
  location: "Kawau Island",
  region: "Auckland Region, NZ",
};


type SanityPosition = {
  _id: string;
  coordinates?: { lat: number; lng: number };
  timestamp?: string;
  locationName?: string;
} | null;

// Raw waypoint type from Sanity (includes heroImage reference)
type SanityWaypoint = Omit<LogEntryWaypoint, "heroImageUrl"> & {
  heroImage?: { asset?: { _ref: string } };
};

export default async function TrackPage() {
  let sanityPosition: SanityPosition = null;
  let activeVoyage: Voyage | null = null;
  let allVoyages: Voyage[] = [];
  let waypoints: LogEntryWaypoint[] = [];

  try {
    // Fetch all data in parallel
    const [positionData, voyageData, voyagesData, waypointsData] = await Promise.all([
      client.fetch<SanityPosition>(LATEST_POSITION_QUERY, {}, fetchOptions),
      client.fetch<Voyage | null>(ACTIVE_VOYAGE_QUERY, {}, fetchOptions),
      client.fetch<Voyage[]>(VOYAGES_FOR_SELECTOR_QUERY, {}, fetchOptions),
      client.fetch<SanityWaypoint[]>(LOG_ENTRIES_WITH_COORDS_QUERY, {}, fetchOptions),
    ]);

    sanityPosition = positionData;
    activeVoyage = voyageData;
    allVoyages = voyagesData || [];
    // Transform waypoints to include pre-computed hero image URLs
    waypoints = (waypointsData || []).map((wp) => ({
      _id: wp._id,
      title: wp.title,
      slug: wp.slug,
      publishedAt: wp.publishedAt,
      category: wp.category,
      excerpt: wp.excerpt,
      location: wp.location,
      voyageTitle: wp.voyageTitle,
      heroImageUrl: wp.heroImage?.asset
        ? urlFor(wp.heroImage)?.width(300).height(120).fit("crop").url() || undefined
        : undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch tracking data from Sanity:", error);
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
        <LiveTracker
          fallback={fallback}
          activeVoyage={activeVoyage}
          allVoyages={allVoyages}
          waypoints={waypoints}
        />
      </main>
    </>
  );
}
