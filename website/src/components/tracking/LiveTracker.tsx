"use client";

import { MarineTrafficEmbed } from "./MarineTrafficEmbed";

const MATARIKI_MMSI = "512004962";

type FallbackPosition = {
  lat: number;
  lng: number;
  location: string;
  region: string;
  updated: string;
};

type LiveTrackerProps = {
  fallback: FallbackPosition;
};

export function LiveTracker({ fallback }: LiveTrackerProps) {
  return (
    <>
      {/* Map Area - Full Screen */}
      <div className="flex-1 relative">
        {/* MarineTraffic Live Map */}
        <div className="absolute inset-0">
          <MarineTrafficEmbed
            mmsi={MATARIKI_MMSI}
            latitude={fallback.lat}
            longitude={fallback.lng}
            zoom={10}
            height="100%"
            showNames={true}
          />
        </div>
      </div>
    </>
  );
}
