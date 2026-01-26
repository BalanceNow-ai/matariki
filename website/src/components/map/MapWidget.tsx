"use client";

import Link from "next/link";
import { MarineTrafficEmbed } from "@/components/tracking/MarineTrafficEmbed";

// MMSI for Matariki III
const MMSI = "512004962";

// Fallback center position for the map
const FALLBACK_CENTER = {
  lat: -36.428167,
  lng: 174.819036,
};

interface MapWidgetProps {
  className?: string;
}

export function MapWidget({ className }: MapWidgetProps) {
  return (
    <div className={`bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl shadow-2xl overflow-hidden ${className || ''}`}>
      {/* MarineTraffic Live Map */}
      <div className="aspect-[4/3] bg-slate-water relative overflow-hidden">
        <MarineTrafficEmbed
          mmsi={MMSI}
          latitude={FALLBACK_CENTER.lat}
          longitude={FALLBACK_CENTER.lng}
          zoom={10}
          showNames={false}
        />
      </div>

      {/* Info panel */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
            <span className="text-xs font-medium text-sea-green uppercase tracking-wider">Live AIS</span>
          </div>
          <span className="text-xs text-storm-grey">
            via MarineTraffic
          </span>
        </div>

        <div>
          <div className="text-lg text-salt-white font-display">Matariki III</div>
          <div className="text-sm text-mist">Click map for vessel details</div>
        </div>

        <Link
          href="/track"
          className="block text-center py-2.5 text-sm text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider border-t border-mist/10 -mx-4 px-4 mt-3 pt-3 hover:bg-midnight-blue/30"
        >
          View Full Track →
        </Link>
      </div>
    </div>
  );
}
