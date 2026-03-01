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

type OpenSeaMapProps = {
  position: VesselPosition;
  trackHistory?: VesselPosition[];
  showTrack?: boolean;
  zoom?: number;
  className?: string;
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
