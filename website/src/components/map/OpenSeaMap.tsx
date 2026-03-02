"use client";

import dynamic from "next/dynamic";

// Types for position data
export type VesselPosition = {
  latitude: number;
  longitude: number;
  timestamp: string;
  heading?: number;
  courseOverGround?: number;
  speedOverGround?: number;
};

// Re-export LogEntryWaypoint type
export type LogEntryWaypoint = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category?: string;
  excerpt?: string;
  location: {
    name?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  voyageTitle?: string;
  heroImageUrl?: string;
};

// Map base layer options
export type MapBaseLayer = "linz" | "esri" | "osm";

type OpenSeaMapProps = {
  position: VesselPosition;
  trackHistory?: VesselPosition[];
  waypoints?: LogEntryWaypoint[];
  showTrack?: boolean;
  showWaypoints?: boolean;
  zoom?: number;
  className?: string;
  /** Base map layer - defaults to LINZ */
  baseLayer?: MapBaseLayer;
};

// Dynamic import wrapper to avoid SSR issues with Leaflet
const OpenSeaMapInner = dynamic(
  () => import("./OpenSeaMapClient").then((mod) => mod.OpenSeaMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-mist animate-pulse">Loading marine chart...</div>
      </div>
    ),
  }
);

export function OpenSeaMap(props: OpenSeaMapProps) {
  return <OpenSeaMapInner {...props} />;
}
